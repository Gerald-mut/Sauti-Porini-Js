import { classifyAudio } from "../services/acousticService.js";
import { getCircuitBreaker } from "../utils/circuitBreaker.js";

const FALLBACK_DEMO = process.argv.includes('--fallback-demo');

if (FALLBACK_DEMO) {
  const breaker = getCircuitBreaker('azure-agent');
  breaker.state = 'OPEN';
  breaker.lastFailureTime = Date.now() - 1000;
  breaker.lastError = new Error('Simulated Azure outage');
  console.log('[FALLBACK DEMO] Azure agent circuit forced OPEN — dispatch will use template fallback');
}

//allback if africas talking ussd isnt working
async function runUSSDSimulation(localePrefix = "") {
  const url = 'http://localhost:3000/api/ussd';
  
  // The standard payload Africa's Talking sends with every request
  const basePayload = {
    sessionId: "demo-session-999-" + (localePrefix || "en"),
    serviceCode: "*384*77#",
    phoneNumber: "+254700000000", // Standard Kenyan format
  };

  try {
    console.log(`\n=== Starting USSD Simulation (Locale: ${localePrefix || "en"}) ===`);
    console.log("[USER] Dialing *384*77#...");
    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, text: localePrefix }) // Empty text means first dial, or locale string
    });
    console.log("[AFRICA'S TALKING RESPONSE]:\n" + await res.text() + "\n");

    await new Promise(resolve => setTimeout(resolve, 1500)); // Pause for effect

    console.log("[USER] Selecting option 1 (Illegal Logging)...");
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, text: localePrefix ? `${localePrefix}*1` : "1" }) 
    });
    console.log("[AFRICA'S TALKING RESPONSE]:\n" + await res.text() + "\n");

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log("[USER] Entering Sector 7...");
    
    const audioInput = { 
      type: 'mock', 
      payload: 'chainsaw motor revving in dense forest area sector 4' 
    };
    const classification = await classifyAudio(audioInput);
    
    console.log(`[ACOUSTIC] Label: ${classification.threat_label} | Confidence: ${classification.confidence}% | Pipeline: ${classification.pipeline} | Keywords: ${classification.keywords_detected.join(", ")}`);
    
    if (classification.threat_label === 'UNKNOWN' && classification.confidence < 30) {
      console.log("[ACOUSTIC WARNING] Low confidence classification but proceed anyway");
    }

    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, text: localePrefix ? `${localePrefix}*1*7` : "1*7", acoustic_classification: classification }) 
    });
    console.log("[AFRICA'S TALKING RESPONSE]:\n" + await res.text() + "\n");

    console.log("[USER] Phone interaction complete.");
    
    // Fetch the latest alert to view the generated dispatch
    const alertsRes = await fetch('http://localhost:3000/api/alerts');
    const alerts = await alertsRes.json();
    const result = alerts[0] || {};
    
    if (localePrefix === "*sw") {
      console.log("[LOCALE TEST] Swahili dispatch generated");
      console.log('[SWAHILI DISPATCH]:', result.dispatch);
      console.log('[ENGLISH REASONING]:', result.reasoning?.[0] || result.reasoning);
    } else {
      console.log('[ENGLISH DISPATCH]:', result.dispatch);
      console.log('[ENGLISH REASONING]:', result.reasoning?.[0] || result.reasoning);
    }
  } catch (error) {
    console.error("Failed to reach the backend. Make sure orchestrator.js is running.", error);
  }
}

async function runTests() {
  await runUSSDSimulation(""); // English
  await runUSSDSimulation("*sw"); // Swahili
}

runTests();
