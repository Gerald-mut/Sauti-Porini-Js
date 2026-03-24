# Debugging Azure Foundry Tool Call Issue

## Problem

Error: `BadRequestError: 400 No tool output found for function call call_9NTasYV12Ahawg18SsgNAiJF`

This suggests the `call_id` in the tool output doesn't match what Azure expects.

## Debugging Steps

### 1. Check the Enhanced Output

Run the script and capture the full console output:

```bash
node src/orchestrator.js 2>&1 | tee output.log
```

Look specifically for:

- `!!! IMPORTANT: Using call_id = "..."` - This shows what we're sending
- `Full call:` - Shows the call object structure from Azure
- `Full toolResults array to send:` - Shows exactly what we're submitting

### 2. Potential Root Causes

**A. Wrong API Method**
The current code uses:

```javascript
response = await openAIClient.responses.create(
  { conversation: conversation.id },
  { input: toolResults, ... }
)
```

This might be wrong. Alternative approaches:

- Check if there's a `responses.submit()` or similar method
- Check if we should use a different client method entirely
- Look for similar examples in the Azure SDK docs

**B. Wrong Field Name**
The API might expect `toolResults` instead of `input`, or a different structure entirely.

**C. Missing Required Fields**
The API might require additional fields we're not providing.

### 3. How to Verify

Check the Azure AI Projects SDK documentation or run:

```javascript
// Show all methods on responses object
Object.getOwnPropertyNames(Object.getPrototypeOf(openAIClient.responses));
```

### 4. Check Package Version

```
cat package.json | grep "@azure/ai-projects"
```

### 5. Verify Agent Registration

The error mentions creating an agent with `createVersion()`. This might be deprecated or incorrect in the current SDK version. Check if there's an agents.create() or agents.deploy() method instead.

## Common Azure Foundry Patterns

Looking at Foundry documentation, tool results might need to be submitted differently:

```javascript
// Alternative 1: Using submitToolResult method (if it exists)
await openAIClient.agents.submitToolResult(toolResults)

// Alternative 2: Including results in same creation call
response = await openAIClient.responses.create(
  { conversation: conversation.id },
  { toolOutputs: toolResults, ... }  // 'toolOutputs' instead of 'input'
)

// Alternative 3: Different API altogether
await conversation.addMessage({ type: "tool", content: toolResults })
```

## What to Look For in Debug Output

- The actual structure of `call.call_id` vs `call.id`
- Whether one or both are undefined
- The exact error response from Azure for more clues
