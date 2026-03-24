import express from "express";
import cors from "cors";
import "dotenv/config";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Global clients persisted across requests
let mcpClient, openAIClient, agent, azureTools;

const SYSTEM_PROMPT = `You are Sauti Porini, an autonomous environmental protection agent operating in Kenya. 
Your primary directive is to analyze incoming environmental data (acoustic sensors, satellite imagery, weather conditions) to detect and verify illegal logging, poaching, or forest fires.

When you receive a threat alert:
1. Analyze the raw data for severity and confidence.
2. Cross-reference the location with local weather and terrain data using your available tools.
3. If the threat is verified, draft a localized, concise dispatch alert for human rangers.
4. Do NOT take irreversible actions without human-in-the-loop verification.

Maintain a professional, urgent, and analytical tone.`;

// Initialize external services on startup
async function initServices() {
  console.log("Booting Sauti Porini Agent Services...");

  // Connect MCP Server
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./src/mcp-server.js"],
  });
  mcpClient = new Client(
    { name: "sauti-porini-orchestrator", version: "1.0.0" },
    { capabilities: {} },
  );
  await mcpClient.connect(transport);
  console.log("✓ MCP Server Online");

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
        sendUpdate("tool_execution", `🛠️ Executing: ${call.name}`);

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
    sendUpdate(
      "error",
      `System failure: ${error.message || "Unknown error"}`,
    );
  } finally {
    res.end();
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", agent: agent?.name || "not initialized" });
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
