/**
 * @file agentService.js
 * @description Service for managing the Azure AI Agent and its tool-use loop.
 * @module services/agentService
 */
import { Alert } from "../models/alert.js";
import { getLiveWeather } from "./weatherService.js";
import logger from "../utils/logger.js";
import config from "../config/index.js";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

let mcpClient, openAIClient, agent, azureTools;

/**
 * Initializes the Azure AI Project Client, MCP Client, and creates the agent version.
 *
 * @returns {Promise<void>} Resolves when initialization is complete
 * @throws {Error} When connection to external services fails
 */
export const initAgent = async () => {
  try {
    logger.info("Booting Sauti Porini Agent Services...");

    const transport = new StdioClientTransport({
      command: "node",
      args: ["./src/mcp-server.js"],
    });
    mcpClient = new Client(
      { name: "sauti-porini-orchestrator", version: "1.0.0" },
      { capabilities: {} },
    );
    await mcpClient.connect(transport);
    logger.info("MCP Server Online");

    const mcpToolsResponse = await mcpClient.listTools();
    const localToolsDef = [
      {
        type: "function",
        name: "get_zone_history",
        description: "Retrieve the last 10 threat events for a given zone from the database",
        parameters: {
          type: "object",
          properties: { zone_id: { type: "string" } },
          required: ["zone_id"]
        }
      },
      {
        type: "function",
        name: "get_live_weather",
        description: "Get current wind speed, wind direction, humidity, and temperature for a geographic coordinate",
        parameters: {
          type: "object",
          properties: { lat: { type: "number" }, lon: { type: "number" } },
          required: ["lat", "lon"]
        }
      },
      {
        type: "function",
        name: "calculate_fire_spread",
        description: "Given wind speed and direction, estimate the primary fire spread vector and affected radius",
        parameters: {
          type: "object",
          properties: {
            wind_speed_kmh: { type: "number" },
            wind_direction_degrees: { type: "number" },
            ignition_lat: { type: "number" },
            ignition_lon: { type: "number" }
          },
          required: ["wind_speed_kmh", "wind_direction_degrees", "ignition_lat", "ignition_lon"]
        }
      }
    ];

    azureTools = mcpToolsResponse.tools.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    })).concat(localToolsDef);

    const project = new AIProjectClient(
      config.azureEndpoint,
      new DefaultAzureCredential(),
    );
    openAIClient = await project.getOpenAIClient();

    const SYSTEM_PROMPT = `You are Sauti Porini, an autonomous environmental protection agent operating in Kenya. 
Your primary directive is to analyze incoming environmental data (acoustic sensors, satellite imagery, weather conditions) to detect and verify illegal logging, poaching, or forest fires.

When you receive a threat alert:
1. Always call get_zone_history first to understand the threat timeline.
2. Always call get_live_weather to get current conditions.
3. Call calculate_fire_spread if wind speed is above 20 km/h.
4. Only draft the final tactical dispatch after reviewing tool results.
5. Do NOT take irreversible actions without human-in-the-loop verification.

The 'locale' field in your context determines output language.
If locale is 'sw', provide the 'dispatch' field in Swahili.
If locale is 'en', provide the 'dispatch' field in English.
The 'reasoning' array must always be in English regardless of locale.
The confidence integer and threat_label are language-agnostic.

Your final response MUST be a valid JSON object with exactly these fields:
{
  "confidence": <integer 0-100 representing your certainty this is a genuine threat, based on data consistency across your tool results>,
  "reasoning": [
    "<step 1: what get_zone_history revealed>",
    "<step 2: what get_live_weather showed>",
    "<step 3: what calculate_fire_spread determined (if called)>",
    "<step 4: why you assessed this confidence level>"
  ],
  "threat_label": "<one of: ILLEGAL_LOGGING, WILDFIRE, VEHICLE_INCURSION, UNKNOWN>",
  "dispatch": "<the full tactical ranger dispatch text>",
  "locale": "<'en' or 'sw' matching the requested language>"
}
Do not wrap it in markdown code fences. Return raw JSON only.

Maintain a professional, urgent, and analytical tone.`;

    agent = await project.agents.createVersion("sauti-porini", {
      kind: "prompt",
      model: config.azureDeployment || "gpt-4o-mini",
      instructions: SYSTEM_PROMPT,
      tools: azureTools,
    });

    logger.info(`System Ready! Agent ${agent.name} v${agent.version} Online`);
  } catch (error) {
    logger.error("Failed to initialize Agent services:", error);
    throw error;
  }
};

/**
 * Executes a local tool call requested by the agent.
 *
 * @param {Object} call - The tool call object containing name and arguments
 * @returns {Promise<string>} Stringified JSON result of the tool execution
 * @throws {Error} Re-throws unexpected execution errors (though mostly caught internally)
 */
export async function executeLocalTool(call) {
  try {
    const args = JSON.parse(call.arguments || "{}");
    if (call.name === "get_zone_history") {
      const history = await Alert.find({ sectorId: args.zone_id }).sort({ timestamp: -1 }).limit(config.maxHistoryLimit);
      return JSON.stringify(history);
    } else if (call.name === "get_live_weather") {
      const data = await getLiveWeather(args.lat, args.lon);
      return JSON.stringify(data);
    } else if (call.name === "calculate_fire_spread") {
      const { wind_speed_kmh, wind_direction_degrees, ignition_lat, ignition_lon } = args;
      const spread_radius_km = wind_speed_kmh * 0.5 * (30 / 60);
      return JSON.stringify({
        spread_radius_km,
        primary_bearing_degrees: wind_direction_degrees,
        estimated_affected_area_km2: Math.PI * Math.pow(spread_radius_km, 2)
      });
    }

    // Fallback to MCP tools
    const mcpResult = await mcpClient.callTool({ name: call.name, arguments: args });
    return mcpResult.content[0].text;
  } catch (err) {
    logger.error(`[AGENT TOOL] Execution failed for ${call.name}:`, err);
    return JSON.stringify({ error: `${call.name} failed: ${err.message}` });
  }
}

/**
 * Parses the raw text response from the agent into a structured object.
 *
 * @param {string} rawText - The raw text output from the model
 * @returns {Object} Structured agent response
 */
function parseAgentResponse(rawText) {
  try {
    const cleanedText = rawText.trim().replace(/^```json/, "").replace(/```$/, "").trim();
    return JSON.parse(cleanedText);
  } catch (err) {
    logger.warn("[AGENT WARNING] Unstructured response — using fallback wrapper");
    return {
      confidence: 50,
      reasoning: ['Agent returned unstructured response'],
      threat_label: 'UNKNOWN',
      dispatch: rawText,
      locale: 'en'
    };
  }
}

/**
 * Runs the main Azure AI agent dispatch loop, executing tools as needed.
 *
 * @param {string} threatContext - The contextual prompt describing the threat
 * @param {string} [locale='en'] - Output language locale ('en' or 'sw')
 * @param {Function} [onUpdate=()=>{}] - Callback for SSE streaming updates
 * @returns {Promise<Object>} The final drafted dispatch and threat data
 * @throws {Error} When the conversation with OpenAI fails
 */
export async function runAgentDispatch(threatContext, locale = 'en', onUpdate = () => {}) {
  try {
    const promptContent = `LANGUAGE INSTRUCTION — THIS IS MANDATORY:
The caller has specified locale: '${locale}'.
If locale is 'sw': you MUST write the 'dispatch' field entirely in Swahili. This is non-negotiable. Do not write English in the dispatch field when locale is 'sw'. Use natural, professional Swahili as spoken in Kenya/East Africa.
If locale is 'en': write the dispatch field in English.
The 'reasoning' array, 'threat_label', and 'confidence' fields must ALWAYS be in English regardless of locale.

Context: ${threatContext}`;

    const conversation = await openAIClient.conversations.create({
      items: [
        {
          type: "message",
          role: "user",
          content: promptContent,
        },
      ],
    });

    let response = await openAIClient.responses.create(
      { conversation: conversation.id },
      { body: { agent: { name: agent.name, type: "agent_reference" } } },
    );

    let iterations = 0;
    const MAX_ITERATIONS = config.maxAgentLoopIterations;
    let finalDispatchData = {
      confidence: 50,
      reasoning: [],
      threat_label: 'UNKNOWN',
      dispatch: "Fallback: Analysis failed."
    };
    let fireSpreadData = null;

    while (iterations < MAX_ITERATIONS) {
      const functionCalls = response.output.filter((item) => item.type === "function_call");

      if (functionCalls.length === 0) {
        finalDispatchData = parseAgentResponse(response.output_text);
        break;
      }

      onUpdate("thinking", `Iteration ${iterations + 1}: Agent analyzing data...`);

      const toolResults = [];
      for (const call of functionCalls) {
        logger.info(`[AGENT TOOL] Executing: ${call.name}`);
        onUpdate("tool_execution", `Executing: ${call.name}`);

        const resultText = await executeLocalTool(call);

        logger.info(`[AGENT TOOL] Result: ${resultText.substring(0, 150)}...`);
        onUpdate("tool_result", `Result: ${resultText.substring(0, 200)}`);

        if (call.name === "calculate_fire_spread") {
          try {
            fireSpreadData = JSON.parse(resultText);
          } catch(e) {}
        }

        toolResults.push({
          type: "function_call_output",
          call_id: call.call_id || call.id,
          output: resultText,
        });
      }

      response = await openAIClient.responses.create(
        { input: toolResults, previous_response_id: response.id },
        { body: { agent: { name: agent.name, type: "agent_reference" } } }
      );

      iterations++;
    }

    if (fireSpreadData) {
      finalDispatchData.fire_spread = fireSpreadData;
    }

    return finalDispatchData;
  } catch (error) {
    logger.error("Error in runAgentDispatch:", error);
    throw error;
  }
}
