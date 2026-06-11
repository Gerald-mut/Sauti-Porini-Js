/**
 * @file ussdController.js
 * @description Controller for handling incoming USSD requests from Africa's Talking.
 * @module controllers/ussdController
 */
import crypto from "crypto";
import { ZoneState } from "../models/ZoneState.js";
import { Alert } from "../models/alert.js";
import { runAgentDispatch } from "../services/agentService.js";
import logger from "../utils/logger.js";
import config from "../config/index.js";

/**
 * Handles POST requests for USSD sessions.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Resolves when the response is sent
 */
export const handleUssd = async (req, res, next) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.warn("USSD request body is empty. Check the callback content-type and payload format.");
      return res.status(400).json({ error: "Bad Request: Missing USSD payload", timestamp: new Date().toISOString() });
    }

    const { sessionId, phoneNumber, text, serviceCode, acoustic_classification } = req.body;

    if (!sessionId || !phoneNumber || text === undefined || !serviceCode) {
      return res.status(400).json({
        error: "Missing required USSD fields",
        required: ["sessionId", "phoneNumber", "text", "serviceCode"],
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`[USSD] Received: sessionId=${sessionId}, phoneNumber=${phoneNumber}, text="${text}"`);

    let locale = "en";
    let processedText = text;

    if (text.startsWith("*sw*") || text === "*sw") {
      locale = "sw";
      processedText = text.replace(/^\*sw\*/, "").replace(/^\*sw$/, "");
    } else if (text.startsWith("*fr*") || text === "*fr") {
      locale = "fr";
      processedText = text.replace(/^\*fr\*/, "").replace(/^\*fr$/, "");
    } else if (text.startsWith("*en*") || text === "*en") {
      locale = "en";
      processedText = text.replace(/^\*en\*/, "").replace(/^\*en$/, "");
    }

    if (processedText === "") {
      const response = `CON Welcome to Sauti Porini Community Watch.\n1. Illegal Logging (Chainsaw)\n2. Forest Fire\n3. Poaching Activity`;
      logger.info(`[USSD] Sending response: "${response}"`);
      res.set("Content-Type", "text/plain");
      return res.send(response);
    } 
    
    if (processedText === "1") {
      const response = `CON Please enter the Sector number (e.g., 7):`;
      logger.info(`[USSD] Sending response: "${response}"`);
      res.set("Content-Type", "text/plain");
      return res.send(response);
    } 
    
    if (!processedText.startsWith("1*")) {
      const response = `END Invalid input. Please try again.`;
      logger.info(`[USSD] Sending response: "${response}"`);
      res.set("Content-Type", "text/plain");
      return res.send(response);
    }

    // Process actual alert
    const sectorNumber = processedText.split("*")[1];
    const targetSector = `SECTOR-${sectorNumber}-KAKAMEGA`;

    const response = `END Thank you. Alert sent for ${targetSector}. Sauti Porini is investigating.`;

    logger.info(`\n [USSD INTEL] Community report received for ${targetSector}! Triggering agent...`);

    try {
      let threatContext = `A local community member just reported illegal logging via USSD in ${targetSector}. Please investigate using your satellite tools and draft a dispatch.`;

      if (acoustic_classification) {
        threatContext += ` Acoustic sensor classification: ${acoustic_classification.threat_label} detected with ${acoustic_classification.confidence}% confidence. Keywords: ${acoustic_classification.keywords_detected.join(", ")}. Pipeline: ${acoustic_classification.pipeline}`;
      }

      await ZoneState.findOneAndUpdate(
        { sectorId: targetSector },
        { currentState: "CRITICAL", lastUpdated: Date.now() },
        { new: true, upsert: true }
      );

      const finalDispatchData = await runAgentDispatch(threatContext, locale);

      const coords = config.sectorMap[targetSector] || config.sectorMap["DEFAULT"];
      await ZoneState.findOneAndUpdate(
        { sectorId: targetSector },
        {
          currentState: "ALERT",
          lastUpdated: Date.now(),
          $push: { activeThreats: "Verified Citizen USSD Report received." },
        }
      );
      
      const phoneHash = crypto.createHash('sha256').update(phoneNumber).digest('hex');
      const maskedPhone = "***" + phoneNumber.slice(-4); 

      await Alert.create({
        sectorId: targetSector,
        threatType: finalDispatchData.threat_label || "ussd",
        threat_label: finalDispatchData.threat_label,
        confidence: finalDispatchData.confidence?.toString() || "0",
        dispatchMessage: finalDispatchData.dispatch,
        dispatch: finalDispatchData.dispatch,
        reasoning: finalDispatchData.reasoning,
        locale: finalDispatchData.locale,
        phone_number: maskedPhone,
        blockchain_proof: phoneHash,
        lat: coords.lat,
        lon: coords.lon,
        fire_spread: finalDispatchData.fire_spread || null
      });

      await ZoneState.findOneAndUpdate(
        { sectorId: targetSector },
        {
          currentState: 'ALERT',
          lastUpdated: Date.now(),
          $push: { activeThreats: "Verified Citizen USSD Report." }
        }
      );

      logger.info(`[USSD] Alert saved and encrypted for ${targetSector}`);
    } catch (error) {
      logger.error("Failed to trigger agent from USSD:", error);
    }

    logger.info(`[USSD] Sending response: "${response}"`);
    res.set("Content-Type", "text/plain");
    return res.send(response);

  } catch (err) {
    next(err);
  }
};
