import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import "dotenv/config";
import config from "./config/index.js";
import logger from "./utils/logger.js";
import errorHandler from "./middleware/errorHandler.js";
import ussdRouter from "./routes/ussd.js";
import zonesRouter from "./routes/zones.js";
import miscRouter from "./routes/misc.js";
import { startFIRMSPolling } from "./services/firmsService.js";
import { initAgent } from "./services/agentService.js";
import { ZoneState } from "./models/ZoneState.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const REQUIRED_ENV_VARS = ["PORT", "MONGODB_URI", "AZURE_AI_PROJECT_ENDPOINT", "AZURE_OPENAI_DEPLOYMENT", "OPENWEATHER_API_KEY"];
const missingEnvVars = REQUIRED_ENV_VARS.filter(v => !process.env[v] || process.env[v].trim() === "");

if (missingEnvVars.length > 0) {
  logger.error("Missing required environment variables:\n" + missingEnvVars.map(v => `   - ${v}`).join("\n"));
  process.exit(1);
} else {
  logger.info("All required environment variables present");
}

const OPTIONAL_ENV_VARS = ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"];
const missingOptional = OPTIONAL_ENV_VARS.filter(v => !process.env[v] || process.env[v].trim() === "");
if (missingOptional.length > 0) {
  logger.warn("Missing optional environment variables (Acoustic classification will use mock_fallback): " + missingOptional.join(", "));
}

/**
 * Main application boot sequence.
 * Connects to the database, initializes the agent, sets up middleware and routes,
 * starts background polling, and binds the server to the configured port.
 *
 * @returns {Promise<void>} Resolves when the server has successfully started
 */
async function boot() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info(" [DATABASE] Connected to Azure Cosmos DB (State Memory Online)");
    
    await ZoneState.findOneAndUpdate(
      { sectorId: "SECTOR-7-KAKAMEGA" },
      { $setOnInsert: { currentState: "NORMAL" } },
      { upsert: true, new: true },
    );

    await initAgent();
    
    app.use("/ussd", ussdRouter);
    app.use("/", zonesRouter);
    app.use("/", miscRouter);
    app.use(errorHandler);

    startFIRMSPolling();

    app.listen(config.port, () => {
      logger.info(`\n Sauti Porini Agent Backend running at http://localhost:${config.port}`);
    });
  } catch (error) {
    logger.error("Startup failed:", error);
    process.exit(1);
  }
}

boot();