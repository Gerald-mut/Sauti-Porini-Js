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

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log("MongoDB offline:", err.message));
} else {
  console.log("set mongodb url in .env");
}

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

//runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  console.log("[WATCHTOWER] Starting forest patrol...");

  try {
    const conversation = await openAIClient.conversations.create({
      items: [
        {
          type: "message",
          role: "user",
          content:
            "Perform a routine security sweep. Check satellite data for SECTOR-7 and SECTOR-8. If a threat is confirmed, draft a dispatch.",
        },
      ],
    });

    let response = await openAIClient.responses.create(
      { conversation: conversation.id },
      { body: { agent: { name: agent.name, type: "agent_reference" } } },
    );

    let iterations = 0;
    const MAX_ITERATIONS = 5;
    let agentFoundThreat = false;

    while (iterations < MAX_ITERATIONS) {
      const functionCalls = response.output.filter(
        (item) => item.type === "function_call",
      );

      if (functionCalls.length === 0) {
        // Check if agent produced a dispatch (indicating threat found)
        if (response.output_text && response.output_text.includes("dispatch")) {
          agentFoundThreat = true;
        }
        break;
      }

      const toolResults = [];

      for (const call of functionCalls) {
        const args = JSON.parse(call.arguments);
        const mcpResult = await mcpClient.callTool({
          name: call.name,
          arguments: args,
        });
        const resultText = mcpResult.content[0].text;

        const safeCallId = call.call_id || call.id;
        toolResults.push({
          type: "function_call_output",
          call_id: safeCallId,
          output: resultText,
        });
      }

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

    // Save alert if threat detected
    if (agentFoundThreat) {
      const coords = SECTOR_MAP[sectorId] || SECTOR_MAP["DEFAULT"];
      await Alert.create({
        sectorId: "SECTOR-7-KAKAMEGA",
        threatType: "Logging",
        confidence: 0.94,
        dispatchMessage: response.output_text,
        lat: coords.lat,
        lon: coords.lon,
      });
      console.log("[WATCHTOWER] Alert saved to database!");
    }
  } catch (err) {
    console.error("Watchtower failed:", err);
  }
});

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
      await Alert.create({
        sectorId: targetSector,
        threatType: "Logging",
        confidence: 0.8,
        dispatchMessage: "Community report via USSD",
        phone_number: phoneNumber,
        lat: coords.lat,
        lon: coords.lon,
      });
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
