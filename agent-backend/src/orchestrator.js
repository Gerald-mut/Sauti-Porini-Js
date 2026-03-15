import 'dotenv/config';
import Groq from "groq-sdk"; 
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Initialize Groq (Make sure GROQ_API_KEY is in your .env file)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Sauti Porini's operational boundaries
const SYSTEM_PROMPT = `
You are Sauti Porini, an autonomous environmental protection agent operating in Kenya. 
Your primary directive is to analyze incoming environmental data (acoustic sensors, satellite imagery, weather conditions) to detect and verify illegal logging, poaching, or forest fires.

When you receive a threat alert:
1. Analyze the raw data for severity and confidence.
2. Cross-reference the location with local weather and terrain data using your available tools.
3. If the threat is verified, draft a localized, concise dispatch alert for human rangers.
4. Do NOT take irreversible actions (like dispatching emergency services) without human-in-the-loop verification from the command dashboard.

Maintain a professional, urgent, and analytical tone. Focus on accuracy to prevent false positives.
`;

async function main() {
  console.log("Initializing Sauti Porini Agentic Subsystem...");
  console.log("System Prompt Loaded.");
  console.log("Connecting to MCP Server...");

  // setup and connect MCP Client
  const transport = new StdioClientTransport({
    command: "node", 
    args: ["./src/mcp-server.js"] 
  });

  const mcpClient = new Client({
    name: "sauti-porini-orchestrator",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await mcpClient.connect(transport);
    console.log("Successfully connected to the Sauti Porini MCP Server!");

    console.log("Asking the MCP Server for its available tools...");
    
    // fetch the tools from your mcp server
    const mcpToolsResponse = await mcpClient.listTools();

    // translate the MCP format into the format Groq expects
    const groqTools = mcpToolsResponse.tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        // MCP calls it inputSchema, Groq calls it parameters
        parameters: tool.inputSchema 
      }
    }));

    console.log(`Automatically discovered and mapped ${groqTools.length} tools!`);

    // setup conversation history
    let messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: "Please check the acoustic sensors in SECTOR-7-KAKAMEGA. If there is a critical threat, take appropriate action." }
    ];

    // Limit to  5 iterations to prevent the agent from getting stuck in an infinite loop
    let iteration = 0;
    const MAX_ITERATIONS = 5;
    let isDone = false;

    while (!isDone && iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`\n[Iteration ${iteration}] Agent is thinking...`);

      // Ask Groq what to do next based on the current conversation history
      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant", 
        messages: messages,
        tools: groqTools,
        tool_choice: "auto"
      });

      const responseMessage = response.choices[0].message;
      messages.push(responseMessage); // Save Groq's response to history

      // Check if Groq decided it needs to use a tool
      if (responseMessage.tool_calls) {
        for (const toolCall of responseMessage.tool_calls) {
          console.log(`\n  Agent decided to use tool: ${toolCall.function.name}`);
          
          const args = JSON.parse(toolCall.function.arguments);
          
          // Execute the actual tool on your MCP Server
          const mcpResult = await mcpClient.callTool({
            name: toolCall.function.name,
            arguments: args
          });

          const resultText = mcpResult.content[0].text;
          console.log(" Tool Execution Result:", resultText);

          // CRITICAL: Feed the result back to Groq so it can analyze the data
          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolCall.function.name,
            content: resultText,
          });
        }
      } else {
        // If no tools were called, the agent has finished its task and is talking to us normally
        console.log(`\n Agent Final Report:\n${responseMessage.content}`);
        isDone = true;
      }
    }

    if (iteration >= MAX_ITERATIONS) {
       console.log("\n Reached maximum iterations. Forcing stop to prevent infinite loop.");
    }

  } catch (error) {
    console.error("Failed to connect or execute:", error);
  }
}

main().catch(console.error);