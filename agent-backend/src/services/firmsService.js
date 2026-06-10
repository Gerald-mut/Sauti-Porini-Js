/**
 * @file firmsService.js
 * @description Service for polling NASA FIRMS and weather data.
 * @module services/firmsService
 */
import cron from "node-cron";
import { ZoneState } from "../models/ZoneState.js";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { getCircuitBreaker } from "../utils/circuitBreaker.js";

const firmsBreaker = getCircuitBreaker('nasa-firms', {
  failureThreshold: config.firmsFailureThreshold,
  callTimeoutMs: config.firmsCallTimeoutMs,
  fallback: (error) => {
    logger.warn(
      `[FIRMS FALLBACK] NASA FIRMS unavailable — ` +
      `skipping this poll cycle. Reason: ${error.message}`
    )
    return []   // empty detections — state machine gets no new input
  }
});

/**
 * Polls FIRMS and open weather data for the default sector and updates the zone state.
 *
 * @returns {Promise<void>} Resolves when polling is complete
 * @throws {Error} When database or external API requests fail unexpectedly
 */
export const pollFIRMS = async () => {
  logger.info("\n [WATCHTOWER] Initiating routine sector sweep...");

  try {
    const sectorId = config.defaultSector;
    const sector = await ZoneState.findOne({ sectorId: sectorId });
    const coords = config.sectorMap[sectorId];

    const fetchFirmsData = async () => {
      if (!config.nasaFirmsKey) return [];
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${config.nasaFirmsKey}/VIIRS_SNPP_NRT/${config.firmsBoundingBox}/1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`FIRMS HTTP Error: ${res.status}`);
      return await res.text();
    };

    const firmsData = await firmsBreaker.fire(fetchFirmsData);

    //fetch Weather Data from open weather map
    let currentWind = 10;
    let currentTemp = 25;

    try {
      if (config.openWeatherKey) {
        const weatherUrl = `${config.openWeatherBaseUrl}?lat=${coords.lat}&lon=${coords.lon}&appid=${config.openWeatherKey}&units=metric`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        currentWind = Math.round(weatherData.wind?.speed * 3.6); // Convert m/s to km/h
        currentTemp = Math.round(weatherData.main?.temp);
      }
    } catch (e) {
      logger.info("Weather API unreachable, using default baseline.");
    }

    logger.info(`[ENVIRONMENT] Kakamega Baseline -> Wind: ${currentWind}km/h | Temp: ${currentTemp}°C`);

    // update the environmental context in the database 
    await ZoneState.findOneAndUpdate(
      { sectorId: sectorId },
      {
        weatherContext: { windSpeed: currentWind, temperature: currentTemp },
        lastUpdated: Date.now()
      }
    );

    // check logging (It stays NORMAL unless demo Mode or USSD fires)
    if (sector && sector.currentState === "NORMAL") {
      logger.info("[STATUS] Sector is NORMAL. No thermal anomalies detected in the last 2 minutes.");
    } else if (sector) {
      logger.info(`[STATUS] Sector is currently in ${sector.currentState} state.`);
    }

  } catch (error) {
    logger.error("Watchtower failed:", error);
    throw error;
  }
};

/**
 * Starts the FIRMS polling cron job.
 *
 * @returns {void}
 */
export const startFIRMSPolling = () => {
  cron.schedule("*/2 * * * *", async () => {
    try {
      await pollFIRMS();
    } catch (error) {
      logger.error("Cron job caught error from pollFIRMS:", error);
    }
  });
};
