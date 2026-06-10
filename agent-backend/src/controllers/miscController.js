/**
 * @file miscController.js
 * @description Controller for miscellaneous endpoints, including analysis and demo resets.
 * @module controllers/miscController
 */
import { ZoneState } from "../models/ZoneState.js";
import { Alert } from "../models/alert.js";
import { runAgentDispatch } from "../services/agentService.js";
import logger from "../utils/logger.js";
import config from "../config/index.js";

/**
 * Initiates an AI agent investigation stream via Server-Sent Events (SSE).
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Resolves when the stream ends
 */
export const analyze = async (req, res, next) => {
  try {
    const { sectorId = config.defaultSector } = req.body || {};

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendUpdate = (type, message) => {
      res.write(`data: ${JSON.stringify({ type, message })}\n\n`);
    };

    try {
      sendUpdate("status", `Alert received for ${sectorId}. Creating Investigation Thread...`);
      const threatContext = `Please check the acoustic sensors in ${sectorId}. If there is a critical threat, take appropriate action.`;
      const finalData = await runAgentDispatch(threatContext, 'en', sendUpdate);
      sendUpdate("complete", finalData);
    } catch (error) {
      logger.error("Error during execution:", error);
      sendUpdate("error", `System failure: ${error.message || "Unknown error"}`);
    } finally {
      res.end();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Triggers a simulated FIRMS satellite thermal anomaly.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Resolves when the response is sent
 */
export const triggerFire = async (req, res, next) => {
  try {
    const targetSector = config.defaultSector;
    logger.info(`\n Simulating NASA FIRMS thermal anomaly in ${targetSector}...`);

    const coords = config.sectorMap[targetSector] || config.sectorMap["DEFAULT"];
    
    await Alert.create({
      sectorId: targetSector,
      threatType: "satellite",
      threat_label: "WILDFIRE",
      confidence: "99",
      dispatchMessage: "NASA FIRMS: High-confidence thermal anomaly detected.",
      dispatch: "NASA FIRMS: High-confidence thermal anomaly detected.",
      reasoning: ["Thermal infrared signatures match active wildfire."],
      locale: "en",
      lat: coords.lat,
      lon: coords.lon,
    });

    const updatedSector = await ZoneState.findOneAndUpdate(
      { sectorId: targetSector },
      {
        currentState: "WATCH",
        lastUpdated: Date.now(),
        $push: { activeThreats: "NASA FIRMS: High-confidence thermal anomaly detected." }
      },
      { new: true }
    );

    logger.info(` [STATE CHANGE] Sector forcefully escalated to WATCH.`);
    res.status(200).json({ 
      success: true, 
      message: "Demo Mode activated. State is now WATCH.", 
      sector: updatedSector,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Processes an incoming IoT acoustic sensor alert.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Resolves when the response is sent
 */
export const iotAlert = async (req, res, next) => {
  try {
    if (!req.body || !req.body.sectorId || !req.body.soundType) {
      return res.status(400).json({ 
        error: "Missing sectorId or soundType",
        required: ["sectorId", "soundType"],
        timestamp: new Date().toISOString()
      });
    }

    const { sectorId, soundType } = req.body;
    
    logger.info(`\n [IoT SENSOR] Receiving acoustic anomaly in ${sectorId}: ${soundType}`);

    const coords = config.sectorMap[sectorId] || config.sectorMap["DEFAULT"];
    const sensorId = `SENSOR-${Math.floor(Math.random() * 1000)}`;
    
    await Alert.create({
      sectorId,
      threatType: "iot",
      threat_label: soundType,
      confidence: "96",
      dispatchMessage: `Acoustic anomaly detected: ${soundType}`,
      dispatch: `Acoustic anomaly detected: ${soundType}`,
      reasoning: [`Detected acoustic pattern matching ${soundType}`],
      locale: "en",
      sensor_id: sensorId,
      sound_type: soundType,
      lat: coords.lat,
      lon: coords.lon,
    });
    
    const updatedSector = await ZoneState.findOneAndUpdate(
      { sectorId },
      {
        currentState: "WATCH",
        lastUpdated: Date.now(),
        $push: { activeThreats: `Acoustic anomaly: ${soundType} detected.` }
      },
      { new: true }
    );
    
    logger.info(` [STATE CHANGE] Sector state updated to WATCH due to acoustic sensor.`);
    res.status(200).json({ 
      success: true, 
      message: "IoT Alert received and processed.", 
      sector: updatedSector,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the most recent alerts from the database.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Resolves when the response is sent
 */
export const getAlerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(config.maxHistoryLimit);
    // Returning raw array as per constraints "dont break frontend"
    res.status(200).json(alerts);
  } catch (error) {
    next(error);
  }
};

/**
 * Resets the demo environment by clearing alerts and zones.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Resolves when the response is sent
 */
export const demoReset = async (req, res, next) => {
  try {
    await Alert.deleteMany({});
    await ZoneState.deleteMany({});
    await ZoneState.create({ sectorId: config.defaultSector, currentState: "NORMAL" });
    logger.info("[SYSTEM] Database wiped clean for demo.");
    res.status(200).json({ 
      message: "System reset to zero. Ready for pitch.",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Processes an incoming thermal anomaly alert and escalates the zone state.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Resolves when the response is sent
 */
export const thermalAlert = async (req, res, next) => {
  try {
    const { sectorId, state, context } = req.body;
    
    if (!sectorId || !state || !context) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["sectorId", "state", "context"],
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`\n [THERMAL SENSOR] Receiving thermal anomaly in ${sectorId}: ${context.temp_celsius}°C (${state})`);

    const coords = config.sectorMap[sectorId] || config.sectorMap["DEFAULT"];

    if (state === "WATCH") {
      const updatedSector = await ZoneState.findOneAndUpdate(
        { sectorId },
        {
          currentState: "WATCH",
          lastUpdated: Date.now(),
          $push: { activeThreats: `Thermal Anomaly: Rapid temperature rise (+${context.delta_celsius.toFixed(1)}°C).` }
        },
        { new: true, upsert: true }
      );
      
      logger.info(` [STATE CHANGE] Sector state updated to WATCH due to thermal sensor.`);
      return res.status(200).json({ 
        success: true, 
        message: "Thermal Alert (WATCH) processed.", 
        sector: updatedSector,
        timestamp: new Date().toISOString()
      });
    } else if (state === "CRITICAL") {
      // Transition to CRITICAL and run AI agent dispatch
      await ZoneState.findOneAndUpdate(
        { sectorId },
        { currentState: "CRITICAL", lastUpdated: Date.now() },
        { new: true, upsert: true }
      );

      let threatContextStr = `A thermal sensor in ${sectorId} has reported a critical temperature spike. Current reading: ${context.temp_celsius}°C (Delta: +${context.delta_celsius.toFixed(1)}°C from ambient).`;
      
      if (context.acoustic_classification) {
        threatContextStr += ` Additional context from acoustic sensor: ${context.acoustic_classification.threat_label} detected with ${context.acoustic_classification.confidence}% confidence. Keywords: ${context.acoustic_classification.keywords_detected.join(", ")}.`;
      }

      const finalDispatchData = await runAgentDispatch(threatContextStr, 'en');
      
      await Alert.create({
        sectorId,
        threatType: finalDispatchData.threat_label || "thermal",
        threat_label: finalDispatchData.threat_label,
        confidence: context.confidence?.toString() || finalDispatchData.confidence?.toString() || "91",
        dispatchMessage: finalDispatchData.dispatch,
        dispatch: finalDispatchData.dispatch,
        reasoning: finalDispatchData.reasoning,
        locale: finalDispatchData.locale,
        lat: coords.lat,
        lon: coords.lon,
        fire_spread: finalDispatchData.fire_spread || null,
        sensor_id: "THERMAL-SENSOR-01"
      });

      const updatedSector = await ZoneState.findOneAndUpdate(
        { sectorId },
        {
          currentState: 'ALERT',
          lastUpdated: Date.now(),
          $push: { activeThreats: `Verified Thermal Threat: ${context.temp_celsius}°C.` }
        },
        { new: true }
      );

      logger.info(`[THERMAL] Critical alert dispatched and saved for ${sectorId}`);
      return res.status(200).json({ 
        success: true, 
        message: "Thermal Alert (CRITICAL) processed and dispatched.", 
        sector: updatedSector,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(400).json({ error: "Invalid state. Must be WATCH or CRITICAL" });
    }
  } catch (error) {
    next(error);
  }
};
