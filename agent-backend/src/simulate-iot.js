async function simulateChainsaw() {
  console.log("Booting up acoustic sensor in SECTOR-7...");
  
  setTimeout(async () => {
    console.log("DEVICE: Anomaly detected: Chainsaw Motor!");
    console.log("Confidence: 96%");
    console.log("DEVICE: Transmitting alert to Sauti Porini State Machine...\n");

    try {
      // Send the alert to the NEW IoT endpoint
      const response = await fetch("http://localhost:3000/api/iot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId: "SECTOR-7-KAKAMEGA", soundType: "CHAINSAW" }),
      });
      
      const data = await response.json();
      console.log(`[CLOUD RESPONSE] ${data.message}`);
      
    } catch (error) {
      console.error(
        "Failed to reach the cloud server. Is orchestrator.js running?",
        error,
      );
    }
  }, 2000);
}

simulateChainsaw();