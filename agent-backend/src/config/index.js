export const SECTOR_MAP = {
  "SECTOR-7-KAKAMEGA": { lat: 0.235, lon: 34.852 },
  "SECTOR-8-KAKAMEGA": { lat: 0.241, lon: 34.881 },
  // Default fallback if a new sector is added
  DEFAULT: { lat: 0.23, lon: 34.85 },
};

/**
 * Global configuration object for the application.
 * Contains all environment variables and constant values.
 *
 * @returns {Object} Frozen configuration object
 */
export default Object.freeze({
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI,
  azureEndpoint: process.env.AZURE_AI_PROJECT_ENDPOINT,
  azureDeployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  openWeatherKey: process.env.OPENWEATHER_API_KEY,
  nasaFirmsKey: process.env.NASA_FIRMS_API_KEY,
  azureSpeechKey: process.env.AZURE_SPEECH_KEY,
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION,
  firmsPollingIntervalMinutes: 15,
  firmsBoundingBox: '34.7,0.1,35.0,0.5',
  maxAgentLoopIterations: 5,
  agentTimeoutMs: 30000,
  rateLimitWindowMs: 60000,
  rateLimitMaxRequests: 10,
  sectorMap: SECTOR_MAP,
  maxHistoryLimit: 10,
  defaultSector: "SECTOR-7-KAKAMEGA",
  maxConfidenceCap: 95,
  openWeatherBaseUrl: "https://api.openweathermap.org/data/2.5/weather",
});
