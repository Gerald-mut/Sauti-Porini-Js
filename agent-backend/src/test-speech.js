import sdk from 'microsoft-cognitiveservices-speech-sdk';
import "dotenv/config";
import config from "./config/index.js";
import logger from "./utils/logger.js";

const speechConfig = sdk.SpeechConfig.fromSubscription(
  config.azureSpeechKey,
  config.azureSpeechRegion
);

const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

synthesizer.speakTextAsync(
  'chainsaw motor revving in dense forest',
  result => {
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      logger.info('✓ Azure Speech connection working — audio synthesized');
    } else {
      logger.error('✗ Synthesis failed:', result.errorDetails);
    }
    synthesizer.close();
  },
  err => {
    logger.error('✗ Connection failed:', err);
    synthesizer.close();
  }
);