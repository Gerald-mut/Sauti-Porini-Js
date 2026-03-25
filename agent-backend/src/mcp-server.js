import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Initialize the mcp server
const server = new Server(
  {
    name: "sauti-porini-tools",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
  },
);

//defines the tools and tells the ai what tools to use and how to use them
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_acoustic_data",
        description:
          "Retrieves the latest acoustic sensor classifications from a specific forest sector. Use this to check for illegal logging or poaching sounds.",
        inputSchema: {
          type: "object",
          properties: {
            sector_id: {
              type: "string",
              description: "The forest sector ID (e.g., 'SECTOR-7-KAKAMEGA')",
            },
          },
          required: ["sector_id"],
        },
      },
      {
        name: "draft_ranger_dispatch",
        description:
          "Drafts an emergency SMS for local rangers. RESPONSIBLE AI GUARDRAIL: This only drafts the message to the database for dashboard review. It does NOT send the SMS.",
        inputSchema: {
          type: "object",
          properties: {
            threat_type: {
              type: "string",
              description: "Type of threat (e.g., 'Chainsaw', 'Gunshot')",
            },
            location: {
              type: "string",
              description: "Coordinates or sector of the threat",
            },
            urgency: { type: "string", description: "High, Medium, or Low" },
          },
          required: ["threat_type", "location", "urgency"],
        },
      },
      {
        name: "check_satellite_data",
        description:
          "Checks recent Sentinel-2 and NASA FIRMS satellite data for a specific sector to detect canopy loss (logging) or thermal anomalies (fires).",
        inputSchema: {
          type: "object",
          properties: {
            sector_id: {
              type: "string",
              description:
                "The ID of the sector to check, e.g., SECTOR-7-KAKAMEGA",
            },
          },
          required: ["sector_id"],
        },
      },
    ],
  };
});

// 2. Execute the Tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_acoustic_data") {
    // Simulating offline edge-AI acoustic detection
    console.log(`Fetching sensor data for ${args.sector_id}...`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            sector: args.sector_id,
            timestamp: new Date().toISOString(),
            primary_audio_classification: "CHAINSAW_MOTOR",
            confidence_score: 0.92,
            status: "CRITICAL_ANOMALY_DETECTED",
          }),
        },
      ],
    };
  }

  if (name === "draft_ranger_dispatch") {
    // Simulating drafting a message to a database
    console.log(
      `Drafting ${args.urgency} urgency dispatch for ${args.threat_type}...`,
    );
    const draftMessage = `ALERT: ${args.threat_type} detected at ${args.location}. Urgency: ${args.urgency}. Please verify and respond.`;

    return {
      content: [
        {
          type: "text",
          text: `Dispatch successfully drafted and pending human approval on the dashboard. Draft content: "${draftMessage}"`,
        },
      ],
    };
  } else if (name === "check_satellite_data") {
    // simulate a positive satellite hit for canopy loss
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            sector: args.sector_id,
            timestamp: new Date().toISOString(),
            canopy_loss_detected: true,
            estimated_area_hectares: 0.45,
            thermal_anomalies: 0,
            satellite_source: "Sentinel-2",
            verification_status: "CONFIRMED_DEFORESTATION",
          }),
        },
      ],
    };
  }

  throw new Error(`Tool not found: ${name}`);
});

// 3. Start the Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sauti Porini MCP Server running on stdio");
}

main().catch(console.error);
