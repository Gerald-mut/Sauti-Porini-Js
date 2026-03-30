async function triggerGodMode() {
  console.log("[GOD MODE] Injecting simulated thermal anomaly into NASA FIRMS data stream...");
  
  try {
    const response = await fetch("http://localhost:3000/api/demo/trigger-fire", {
      method: "POST"
    });
    
    const data = await response.json();
    console.log(`[CLOUD RESPONSE] ${data.message}`);
    
  } catch (error) {
    console.error("Failed to trigger fire. Is orchestrator.js running?", error);
  }
}

triggerGodMode();