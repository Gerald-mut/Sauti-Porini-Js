/**
 * @file zonesController.js
 * @description Controller for handling zone states and health checks.
 * @module controllers/zonesController
 */
import { ZoneState } from "../models/ZoneState.js";
import config from "../config/index.js";
import { getAllBreakerStatuses } from "../utils/circuitBreaker.js";

/**
 * Retrieves the current status and data for zones, optionally filtered by state.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Resolves when the response is sent
 */
export const getZones = async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    let filter = {};
    if (req.query.state) {
      const queryState = req.query.state.toUpperCase();
      const validStates = ['NORMAL', 'WATCH', 'CRITICAL'];
      
      if (!validStates.includes(queryState)) {
        return res.status(400).json({ 
          error: "Invalid state filter", 
          valid: validStates,
          timestamp: new Date().toISOString()
        });
      }
      
      if (queryState === "CRITICAL") {
        filter.currentState = { $in: ["CRITICAL", "ALERT"] };
      } else {
        filter.currentState = queryState;
      }
    }

    const zones = await ZoneState.find(filter);
    const zonesWithCoords = zones.map(zone => {
      const coords = config.sectorMap[zone.sectorId] || config.sectorMap["DEFAULT"];
      return { ...zone.toObject(), lat: coords.lat, lon: coords.lon };
    });

    res.status(200).json({
      zones: zonesWithCoords,
      count: zonesWithCoords.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the system health and zone statistics.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Resolves when the response is sent
 */
export const getHealth = async (req, res, next) => {
  try {
    const [total, normal, watch, critical] = await Promise.all([
      ZoneState.countDocuments(),
      ZoneState.countDocuments({ currentState: "NORMAL" }),
      ZoneState.countDocuments({ currentState: "WATCH" }),
      ZoneState.countDocuments({ currentState: { $in: ["CRITICAL", "ALERT"] } })
    ]);

    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      zones: {
        total,
        normal,
        watch,
        critical
      },
      uptime_seconds: Math.round(process.uptime()),
      breakers: getAllBreakerStatuses()
    });
  } catch (error) {
    error.status = 503;
    next(error);
  }
};
