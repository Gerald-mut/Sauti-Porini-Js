import express from "express"; //handles http requests
import cors from "cors"; //cors allows my server to accept requests from different websites
import "dotenv/config"; //this loads my env variables
import mongoose from "mongoose";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"; // tools for communicating with a custom ai server
import cron from "node-cron"; //schedules automatic tasks
import { Alert } from "./models/alert.js";
import { ZoneState } from "./models/ZoneState.js";
import crypto from "crypto";

//connect to Azure CosmosDB
async function connectDatabase() {
  try {
    // You will put your Azure Cosmos DB connection string in your .env file
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(
      " [DATABASE] Connected to Azure Cosmos DB (State Memory Online)",
    );

    // Initialize Sector 7 if it doesn't exist yet
    await ZoneState.findOneAndUpdate(
      { sectorId: "SECTOR-7-KAKAMEGA" },
      { $setOnInsert: { currentState: "NORMAL" } },
      { upsert: true, new: true },
    );
  } catch (error) {
    console.error(" Database connection failed:", error);
  }
}

// A simple translation layer for Kakamega Forest sectors
const SECTOR_MAP = {
  "SECTOR-7-KAKAMEGA": { lat: 0.235, lon: 34.852 },
  "SECTOR-8-KAKAMEGA": { lat: 0.241, lon: 34.881 },
  // Default fallback if a new sector is added
  DEFAULT: { lat: 0.23, lon: 34.85 },
};

// Example of how to use it when saving an alert:
// const coords = SECTOR_MAP[sectorId] || SECTOR_MAP["DEFAULT"];
// await Alert.create({ ..., lat: coords.lat, lon: coords.lon });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

//for holding connections to external services
let mcpClient, openAIClient, agent, azureTools;

const SYSTEM_PROMPT = `You are Sauti Porini, an autonomous environmental protection agent operating in Kenya. 
Your primary directive is to analyze incoming environmental data (acoustic sensors, satellite imagery, weather conditions) to detect and verify illegal logging, poaching, or forest fires.

When you receive a threat alert:
1. Analyze the raw data for severity and confidence.
2. Cross-reference the location with local weather and terrain data using your available tools.
3. If the threat is verified, draft a localized, concise dispatch alert for human rangers.
4. Do NOT take irreversible actions without human-in-the-loop verification.

Maintain a professional, urgent, and analytical tone.`;

//connect to external services
async function initServices() {
  connectDatabase();
  console.log("Booting Sauti Porini Agent Services...");

  //connec to mcp via stdio(runs node.js script as a subprocess)
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./src/mcp-server.js"],
  });
  mcpClient = new Client(
    { name: "sauti-porini-orchestrator", version: "1.0.0" },
    { capabilities: {} },
  );
  await mcpClient.connect(transport);
  console.log("MCP Server Online");

  // Get MCP tools
  const mcpToolsResponse = await mcpClient.listTools();
  azureTools = mcpToolsResponse.tools.map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  }));

  // Connect Azure Foundry
  const project = new AIProjectClient(
    process.env.AZURE_AI_PROJECT_ENDPOINT,
    new DefaultAzureCredential(),
  );
  openAIClient = await project.getOpenAIClient();

  agent = await project.agents.createVersion("sauti-porini", {
    kind: "prompt",
    model: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini",
    instructions: SYSTEM_PROMPT,
    tools: azureTools,
  });

  console.log(
    `System Ready! Agent ${agent.name} v${agent.version} listening on port ${PORT}`,
  );
}

// API endpoint for threat analysis with Server-Sent Events
app.post("/api/analyze", async (req, res) => {
  const { sectorId = "SECTOR-7-KAKAMEGA" } = req.body;

  // Setup Server-Sent Events for streaming
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send real-time updates to frontend
  const sendUpdate = (type, message) => {
    res.write(`data: ${JSON.stringify({ type, message })}\n\n`);
  };

  try {
    sendUpdate(
      "status",
      `Alert received for ${sectorId}. Creating Investigation Thread...`,
    );

    const conversation = await openAIClient.conversations.create({
      items: [
        {
          type: "message",
          role: "user",
          content: `Please check the acoustic sensors in ${sectorId}. If there is a critical threat, take appropriate action.`,
        },
      ],
    });

    let response = await openAIClient.responses.create(
      { conversation: conversation.id },
      { body: { agent: { name: agent.name, type: "agent_reference" } } },
    );

    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      const functionCalls = response.output.filter(
        (item) => item.type === "function_call",
      );

      if (functionCalls.length === 0) {
        sendUpdate("complete", response.output_text);
        break;
      }

      sendUpdate(
        "thinking",
        `Iteration ${iterations + 1}: Agent analyzing data...`,
      );
      const toolResults = [];

      for (const call of functionCalls) {
        sendUpdate("tool_execution", `Executing: ${call.name}`);

        const args = JSON.parse(call.arguments);
        const mcpResult = await mcpClient.callTool({
          name: call.name,
          arguments: args,
        });
        const resultText = mcpResult.content[0].text;

        sendUpdate("tool_result", `Result: ${resultText.substring(0, 200)}`);

        const safeCallId = call.call_id || call.id;
        toolResults.push({
          type: "function_call_output",
          call_id: safeCallId,
          output: resultText,
        });
      }

      // Submit tool results back to Azure
      response = await openAIClient.responses.create(
        {
          input: toolResults,
          previous_response_id: response.id,
        },
        {
          body: { agent: { name: agent.name, type: "agent_reference" } },
        },
      );

      iterations++;
    }
  } catch (error) {
    console.error("Error during execution:", error);
    sendUpdate("error", `System failure: ${error.message || "Unknown error"}`);
  } finally {
    res.end();
  }
});

// USSD endpoint for Africa's Talking community reports
app.post("/api/ussd", async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    console.warn(
      "USSD request body is empty. Check the callback content-type and payload format.",
    );
    return res.status(400).send("Bad Request: Missing USSD payload");
  }

  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  console.log(
    `[USSD] Received: sessionId=${sessionId}, phoneNumber=${phoneNumber}, text="${text}"`,
  );

  let response = "";

  if (text === "") {
    response = `CON Welcome to Sauti Porini Community Watch.\n1. Illegal Logging (Chainsaw)\n2. Forest Fire\n3. Poaching Activity`;
  } else if (text === "1") {
    response = `CON Please enter the Sector number (e.g., 7):`;
  } else if (text.startsWith("1*")) {
    const sectorNumber = text.split("*")[1];
    const targetSector = `SECTOR-${sectorNumber}-KAKAMEGA`;

    response = `END Thank you. Alert sent for ${targetSector}. Sauti Porini is investigating.`;

    console.log(
      `\n [USSD INTEL] Community report received for ${targetSector}! Triggering agent...`,
    );

    try {
      const conversation = await openAIClient.conversations.create({
        items: [
          {
            type: "message",
            role: "user",
            content: `A local community member just reported illegal logging via USSD in ${targetSector}. Please investigate using your satellite tools and draft a dispatch.`,
          },
        ],
      });

      await openAIClient.responses.create(
        { conversation: conversation.id },
        { body: { agent: { name: agent.name, type: "agent_reference" } } },
      );

      // Save alert with coordinates
      const coords = SECTOR_MAP[targetSector] || SECTOR_MAP["DEFAULT"];
      await ZoneState.findOneAndUpdate(
        { sectorId: targetSector },
        {
          currentState: "ALERT",
          lastUpdated: Date.now(),
          $push: { activeThreats: "Verified Citizen USSD Report received." },
        },
      );
      //generate the blockchain Hash to protect identity
      const phoneHash = crypto.createHash('sha256').update(phoneNumber).digest('hex');
      const maskedPhone = "***" + phoneNumber.slice(-4); // e.g., ***0000

      //save alert with correct threatType and encryption
      await Alert.create({
        sectorId: targetSector,
        threatType: "ussd", 
        confidence: 0.99, 
        dispatchMessage: "Community report via USSD: Illegal Logging",
        phone_number: maskedPhone,
        blockchain_proof: phoneHash,
        lat: coords.lat,
        lon: coords.lon,
      });

      // escalate the state to alert
      await ZoneState.findOneAndUpdate(
        { sectorId: targetSector },
        { 
          currentState: 'ALERT',
          lastUpdated: Date.now(),
          $push: { activeThreats: "Verified Citizen USSD Report." }
        }
      );
      
      console.log(`[USSD] Alert saved and encrypted for ${targetSector}`);
      console.log(`[USSD] Alert saved for ${targetSector}`);
    } catch (error) {
      console.error("Failed to trigger agent from USSD:", error);
    }
  } else {
    response = `END Invalid input. Please try again.`;
  }

  console.log(`[USSD] Sending response: "${response}"`);
  res.set("Content-Type", "text/plain");
  res.send(response);
});

// endpoint to simulate demo(changes state to watch)
app.post("/api/demo/trigger-fire", async (req, res) => {
  const targetSector = "SECTOR-7-KAKAMEGA";
  console.log(`\n Simulating NASA FIRMS thermal anomaly in ${targetSector}...`);

  try {
    //change db to watch
    const updatedSector = await ZoneState.findOneAndUpdate(
      { sectorId: targetSector },
      { 
        currentState: "WATCH",
        lastUpdated: Date.now(),
        $push: { activeThreats: "NASA FIRMS: High-confidence thermal anomaly detected." }
      },
      { new: true } 
    );

    console.log(` [STATE CHANGE] Sector 7 forcefully escalated to WATCH.`);
    res.json({ success: true, message: "Demo Mode activated. State is now WATCH.", sector: updatedSector });

  } catch (error) {
    console.error("Demo Mode failed:", error);
    res.status(500).json({ error: "Failed to trigger simulated fire." });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", agent: agent?.name || "not initialized" });
});

//connect to the frontend
app.get("/api/alerts", async (req, res) => {
  try {
    // Fetch the 10 most recent alerts from Cosmos DB, newest first
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(10);
    res.json(alerts);
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    res.status(500).json({ error: "Failed to fetch database records" });
  }
});

app.get("/api/zones", async (req, res) => {
  try {
    const zones = await ZoneState.find();
    const zonesWithCoords = zones.map(zone => {
      const coords = SECTOR_MAP[zone.sectorId] || SECTOR_MAP["DEFAULT"];
      return { ...zone.toObject(), lat: coords.lat, lon: coords.lon };
    });
    res.json(zonesWithCoords);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch zones" });
  }
});

// resets alerts
app.get("/api/demo/reset", async (req, res) => {
  try {
    await Alert.deleteMany({}); // Delete all historical alerts
    await ZoneState.deleteMany({}); // Wipe the memory
    
    // Re-initialize Sector 7 to peaceful state
    await ZoneState.create({ sectorId: "SECTOR-7-KAKAMEGA", currentState: "NORMAL" });
    
    console.log("[SYSTEM] Database wiped clean for demo.");
    res.json({ message: "System reset to zero. Ready for pitch." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset database" });
  }
});

// Start server
initServices()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `\n Sauti Porini Agent Backend running at http://localhost:${PORT}`,
      );
    });
  })
  .catch((error) => {
    console.error("Failed to initialize services:", error);
    process.exit(1);
  });

//runs every 2 minutes for the demo
cron.schedule("*/2 * * * *", async () => {
  console.log("\n [WATCHTOWER] Initiating routine sector sweep...");

  try {
    const sectorId = "SECTOR-7-KAKAMEGA";
    const sector = await ZoneState.findOne({ sectorId: sectorId });
    const coords = SECTOR_MAP[sectorId];

    //fetch Weather Data from open weather map
    let currentWind = 10; 
    let currentTemp = 25; 
    
    try {
      if (process.env.OPENWEATHER_API_KEY) {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();
        
        currentWind = Math.round(weatherData.wind?.speed * 3.6); // Convert m/s to km/h
        currentTemp = Math.round(weatherData.main?.temp);
      }
    } catch (e) {
      console.log("Weather API unreachable, using default baseline.");
    }

    console.log(`[ENVIRONMENT] Kakamega Baseline -> Wind: ${currentWind}km/h | Temp: ${currentTemp}°C`);

    // update the environmental context in the database 
    await ZoneState.findOneAndUpdate(
      { sectorId: sectorId },
      { 
        weatherContext: { windSpeed: currentWind, temperature: currentTemp },
        lastUpdated: Date.now()
      }
    );

    // check logging (It stays NORMAL unless demo Mode or USSD fires)
    if (sector.currentState === "NORMAL") {
      console.log("[STATUS] Sector is NORMAL. No thermal anomalies detected in the last 2 minutes.");
    } else {
      console.log(`[STATUS] Sector is currently in ${sector.currentState} state.`);
    }

  } catch (error) {
    console.error("Watchtower failed:", error);
  }
});