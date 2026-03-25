//allback if africas talking ussd isnt working
async function runUSSDSimulation() {
  const url = 'http://localhost:3000/api/ussd';
  
  // The standard payload Africa's Talking sends with every request
  const basePayload = {
    sessionId: "demo-session-999",
    serviceCode: "*384*77#",
    phoneNumber: "+254700000000", // Standard Kenyan format
  };

  try {
    console.log("[USER] Dialing *384*77#...");
    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, text: "" }) // Empty text means first dial
    });
    console.log("[AFRICA'S TALKING RESPONSE]:\n" + await res.text() + "\n");

    await new Promise(resolve => setTimeout(resolve, 1500)); // Pause for effect

    console.log("[USER] Selecting option 1 (Illegal Logging)...");
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, text: "1" }) // User replied '1'
    });
    console.log("[AFRICA'S TALKING RESPONSE]:\n" + await res.text() + "\n");

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log("[USER] Entering Sector 7...");
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...basePayload, text: "1*7" }) // User replied '7' (cumulative text: '1*7')
    });
    console.log("[AFRICA'S TALKING RESPONSE]:\n" + await res.text() + "\n");

    console.log("[USER] Phone interaction complete. Watch the Orchestrator terminal to see the AI wake up!");

  } catch (error) {
    console.error("Failed to reach the backend. Make sure orchestrator.js is running.", error);
  }
}

runUSSDSimulation();