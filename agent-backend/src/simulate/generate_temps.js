import mongoose from "mongoose";
import "dotenv/config";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { ZoneState } from "../models/ZoneState.js";
import { classifyAudio } from "../services/acousticService.js";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getSeededRandom(seedString) {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = Math.imul(31, hash) + seedString.charCodeAt(i) | 0;
  }
  return ((Math.abs(hash) % 1000) / 1000) * 4 - 2; // Returns a value between -2 and +2
}

async function generateAmbientReadings() {
  let zoneIds = [];
  try {
    const zones = await ZoneState.find({}, 'sectorId');
    zoneIds = zones.map(z => z.sectorId);
  } catch (err) {
    logger.warn(`[TEMP ENGINE] Failed to fetch zones from DB: ${err.message}`);
  }

  if (zoneIds.length === 0) {
    logger.warn("[TEMP ENGINE] DB has zero zones, using mock IDs");
    zoneIds = ['ZONE-KAKAMEGA-01', 'ZONE-KAKAMEGA-02', 'ZONE-KAKAMEGA-03'];
  }

  const hour = new Date().getUTCHours();
  let baseTemp = 25;
  let timeOfDayLabel = "unknown";

  if (hour >= 0 && hour <= 5) {
    baseTemp = 20; 
    timeOfDayLabel = "Night (Pre-dawn)";
  } else if (hour >= 6 && hour <= 9) {
    baseTemp = 22.5; 
    timeOfDayLabel = "Morning (Warming)";
  } else if (hour >= 10 && hour <= 14) {
    baseTemp = 29; 
    timeOfDayLabel = "Midday (Peak Heat)";
  } else if (hour >= 15 && hour <= 17) {
    baseTemp = 31; 
    timeOfDayLabel = "Afternoon (Fire Risk Window)";
  } else if (hour >= 18 && hour <= 21) {
    baseTemp = 26; 
    timeOfDayLabel = "Evening (Cooling)";
  } else if (hour >= 22 && hour <= 23) {
    baseTemp = 21.5; 
    timeOfDayLabel = "Late Night (Cool)";
  }

  const readings = zoneIds.map(zoneId => {
    const microClimateVar = getSeededRandom(zoneId);
    const noise = Math.random() * 1.5 - 0.75;
    const temp = Math.round((baseTemp + microClimateVar + noise) * 10) / 10;
    
    const humidity = Math.round(100 - (temp * 1.5) + (Math.random() * 10 - 5));
    const clampedHumidity = Math.max(55, Math.min(85, humidity));

    return {
      zone_id: zoneId,
      temp_celsius: temp,
      humidity_percent: clampedHumidity,
      timestamp: new Date().toISOString(),
      source: 'thermal_sensor',
      time_of_day_label: timeOfDayLabel
    };
  });

  for (const r of readings) {
    logger.info(`[TEMP] Zone ${r.zone_id} | ${r.temp_celsius}°C | Humidity: ${r.humidity_percent}% | ${r.time_of_day_label}`);
  }

  return readings;
}

async function triggerThermalSpike(zoneId, ambientTemp, opts = {}) {
  const peakTemp = opts.peakTemp || 58;
  const rampSteps = opts.rampSteps || 6;
  const rampIntervalMs = opts.rampIntervalMs || 4000;
  const holdMs = opts.holdMs || 8000;

  const rampDeltas = [4, 9, 16, 25, 36, peakTemp - ambientTemp];
  let watchTemp = 0;
  
  for (let i = 0; i < rampSteps; i++) {
    const stepNumber = i + 1;
    const currentDelta = rampDeltas[i] || (peakTemp - ambientTemp);
    const currentTemp = Math.round((ambientTemp + currentDelta) * 10) / 10;

    logger.info(`[SPIKE] Zone ${zoneId} | Ramp step ${stepNumber}/${rampSteps} | ${currentTemp}°C | Δ+${currentDelta.toFixed(1)}°C from ambient ▲`);

    if (stepNumber === 4) {
      watchTemp = currentTemp;
      try {
        await fetch("http://localhost:3000/api/thermal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectorId: zoneId,
            state: "WATCH",
            context: {
              trigger: "thermal_sensor",
              temp_celsius: currentTemp,
              delta_celsius: currentDelta,
              confidence: 72
            }
          })
        });
      } catch (err) {
        logger.error(`[SPIKE ERROR] Failed to escalate to WATCH: ${err.message}`);
      }
    }

    if (stepNumber === 6) {
      try {
        const classification = await classifyAudio({ 
          type: 'mock', 
          payload: 'fire crackling intense heat smoke forest' 
        });

        logger.info(`[SPIKE] *** CRITICAL THRESHOLD REACHED — Azure agent dispatching ***`);

        await fetch("http://localhost:3000/api/thermal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectorId: zoneId,
            state: "CRITICAL",
            context: {
              trigger: "thermal_sensor",
              temp_celsius: currentTemp,
              delta_celsius: currentDelta,
              confidence: 91,
              acoustic_classification: classification
            }
          })
        });
      } catch (err) {
        logger.error(`[SPIKE ERROR] Failed to escalate to CRITICAL: ${err.message}`);
      }
    }

    if (stepNumber < rampSteps) {
      await sleep(rampIntervalMs);
    }
  }

  await sleep(holdMs);
  logger.info(`[SPIKE] Thermal event subsiding — zone returning to ambient`);
  
  return {
    zone_id: zoneId,
    ambient: ambientTemp,
    peak: Math.round((ambientTemp + rampDeltas[5]) * 10) / 10,
    delta: Math.round(rampDeltas[5] * 10) / 10,
    watch_step: 4,
    watch_temp: watchTemp,
    critical_step: 6,
    critical_temp: Math.round((ambientTemp + rampDeltas[5]) * 10) / 10
  };
}

let isRunning = true;

async function main() {
  process.on('SIGINT', () => {
    logger.info("[TEMP ENGINE] Shutting down and exit cleanly");
    isRunning = false;
    process.exit(0);
  });

  try {
    await mongoose.connect(config.mongoUri);
  } catch (err) {
    logger.warn(`[DATABASE] Failed to connect: ${err.message}`);
  }

  const args = process.argv.slice(2);
  let mode = 'spike';
  let targetZone = null;
  let peak = 58;
  let interval = 4000;

  args.forEach(arg => {
    if (arg.startsWith('--mode=')) mode = arg.split('=')[1];
    if (arg.startsWith('--zone=')) targetZone = arg.split('=')[1];
    if (arg.startsWith('--peak=')) peak = parseFloat(arg.split('=')[1]);
    if (arg.startsWith('--interval=')) interval = parseInt(arg.split('=')[1]);
  });

  if (mode === 'ambient') {
    logger.info("[TEMP ENGINE] Ambient mode — polling every 30s");
    while (isRunning) {
      await generateAmbientReadings();
      await sleep(30000);
    }
  } else if (mode === 'spike') {
    const initialReadings = await generateAmbientReadings();
    
    if (!targetZone && initialReadings.length > 0) {
      const hottest = initialReadings.reduce((prev, current) => 
        (prev.temp_celsius > current.temp_celsius) ? prev : current
      );
      targetZone = hottest.zone_id;
    } else if (!targetZone) {
      targetZone = 'ZONE-KAKAMEGA-01';
    }

    const baselineReading = initialReadings.find(r => r.zone_id === targetZone) || { temp_celsius: 25 };

    await sleep(3000);
    logger.info(`[SPIKE] Initiating thermal spike sequence on zone ${targetZone}...`);
    
    const spikeSummary = await triggerThermalSpike(targetZone, baselineReading.temp_celsius, {
      peakTemp: peak,
      rampIntervalMs: interval
    });

    logger.info("╔══════════════════════════════════════════╗");
    logger.info("║      THERMAL SPIKE DEMO COMPLETE         ║");
    logger.info("╠══════════════════════════════════════════╣");
    logger.info(`║  Zone:        ${spikeSummary.zone_id.padEnd(26)} ║`);
    logger.info(`║  Ambient:     ${(spikeSummary.ambient + "°C").padEnd(26)} ║`);
    logger.info(`║  Peak:        ${(spikeSummary.peak + "°C").padEnd(26)} ║`);
    logger.info(`║  Delta:       ${("+" + spikeSummary.delta + "°C").padEnd(26)} ║`);
    logger.info(`║  WATCH at:    ${(`step ${spikeSummary.watch_step} (${spikeSummary.watch_temp}°C)`).padEnd(26)} ║`);
    logger.info(`║  CRITICAL at: ${(`step ${spikeSummary.critical_step} (${spikeSummary.critical_temp}°C)`).padEnd(26)} ║`);
    logger.info("║  Agent:       dispatched ✓               ║");
    logger.info("╚══════════════════════════════════════════╝");

    logger.info("[TEMP ENGINE] Returning to ambient mode — polling every 30s");
    while (isRunning) {
      await generateAmbientReadings();
      await sleep(30000);
    }
  }
}

main();
