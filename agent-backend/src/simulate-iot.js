async function simulateChainsaw() {
  console.log("Booting up....listening.....");
  setTimeout(async () => {
    console.log("DEVICE: Anomaly detected: Chainsaw Motor!");
    console.log("Confidence: 96%");
    console.log("DEVICE: Transmitting alert to Sauti Porini Agent...\n");

    try {
      //send the alert to the express api
      const response = await fetch("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId: "SECTOR-7-KAKAMEGA" }),
      });
      //reads the stream of incoming data from the api in small chunks
      const reader = response.body.getReader();
      //utf-8 converts the raw bytes to text
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (let line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.replace("data: ", ""));
            //print the live AI reasoning back to the terminal
            console.log(`[CLOUD] ${data.message}`);
          }
        }
      }
    } catch (error) {
      console.error(
        "Failed to reach the cloud server. Is orchestrator.js running?",
        error,
      );
    }
  }, 2000);
}

simulateChainsaw();
