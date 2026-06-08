import logger from "./utils/logger.js";

async function simulateChainsaw() {
  logger.info("Booting up acoustic sensor in SECTOR-7...");
  
  setTimeout(async () => {
    logger.info("DEVICE: Anomaly detected: Chainsaw Motor!");
    logger.info("Confidence: 96%");
    logger.info("DEVICE: Transmitting alert to Sauti Porini State Machine...\n");

    try {
      // Send the alert to the NEW IoT endpoint
      const response = await fetch("http://localhost:3000/api/iot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId: "SECTOR-7-KAKAMEGA", soundType: "CHAINSAW" }),
      });
      
      const data = await response.json();
      logger.info(`[CLOUD RESPONSE] ${data.message}`);
      
    } catch (error) {
      logger.error(
        "Failed to reach the cloud server. Is orchestrator.js running?",
        error,
      );
    }
  }, 2000);
}

simulateChainsaw();