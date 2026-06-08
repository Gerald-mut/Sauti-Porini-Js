/**
 * @file acousticService.js
 * @description Service for classifying acoustic sensor data using Azure Cognitive Services.
 * @module services/acousticService
 */
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";
import config from "../config/index.js";
import logger from "../utils/logger.js";

const KEYWORD_MAP = {
  ILLEGAL_LOGGING: ['chainsaw', 'cutting', 'logging', 'tree', 'motor'],
  WILDFIRE: ['fire', 'smoke', 'burning', 'flame', 'heat'],
  VEHICLE_INCURSION: ['vehicle', 'truck', 'engine', 'car', 'motor'],
  GUNSHOT: ['gunshot', 'shot', 'gun', 'rifle', 'bang']
};

/**
 * Classifies an audio input stream or mock payload against known threat keywords.
 *
 * @param {Object} audioInput - Audio input data object containing type and payload
 * @returns {Promise<Object>} The classification result including threat label and confidence
 * @throws {Error} Re-throws unexpected errors
 */
export async function classifyAudio(audioInput) {
  try {
    let transcript = "";
    let pipeline = "mock_fallback";

    const hasAzureKeys = config.azureSpeechKey && config.azureSpeechRegion;

    if (hasAzureKeys) {
      pipeline = "azure_speech";
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        config.azureSpeechKey,
        config.azureSpeechRegion
      );
      speechConfig.speechRecognitionLanguage = "en-US";

      if (audioInput.type === "mock") {
        transcript = await new Promise((resolve) => {
          // Pass null for AudioConfig to synthesize to memory without speaker output
          const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

          synthesizer.speakTextAsync(
            audioInput.payload,
            (result) => {
              synthesizer.close();
              if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                const pushStream = sdk.AudioInputStream.createPushStream();
                pushStream.write(result.audioData);
                pushStream.close();

                const audioConfigRec = sdk.AudioConfig.fromStreamInput(pushStream);
                const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfigRec);

                recognizer.recognizeOnceAsync(
                  (recResult) => {
                    recognizer.close();
                    if (recResult.reason === sdk.ResultReason.RecognizedSpeech) {
                      resolve(recResult.text);
                    } else {
                      resolve(audioInput.payload);
                    }
                  },
                  () => {
                    recognizer.close();
                    resolve(audioInput.payload);
                  }
                );
              } else {
                resolve(audioInput.payload);
              }
            },
            () => {
              synthesizer.close();
              resolve(audioInput.payload);
            }
          );
        });
      } else if (audioInput.type === "file") {
        transcript = await new Promise((resolve) => {
          try {
            const fileBuffer = fs.readFileSync(audioInput.payload);
            const pushStream = sdk.AudioInputStream.createPushStream();
            pushStream.write(fileBuffer.buffer ? fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) : fileBuffer);
            pushStream.close();

            const audioConfigRec = sdk.AudioConfig.fromStreamInput(pushStream);
            const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfigRec);

            recognizer.recognizeOnceAsync(
              (result) => {
                recognizer.close();
                if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                  resolve(result.text);
                } else {
                  resolve("");
                }
              },
              () => {
                recognizer.close();
                resolve("");
              }
            );
          } catch (e) {
            resolve("");
          }
        });
      }
    } else {
      transcript = audioInput.type === "mock" ? audioInput.payload : "";
    }

    // Step B: Keyword extraction
    const lowerTranscript = transcript.toLowerCase();
    let bestCategory = "UNKNOWN";
    let maxMatches = 0;
    let detectedKeywords = [];
    let bestTotalCategoryKeywords = 1;

    for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
      let matches = 0;
      let matchedInThisCategory = [];
      for (const kw of keywords) {
        if (lowerTranscript.includes(kw.toLowerCase())) {
          matches++;
          matchedInThisCategory.push(kw);
        }
      }

      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
        detectedKeywords = matchedInThisCategory;
        bestTotalCategoryKeywords = keywords.length;
      }
    }

    // Step C: Classification result
    let confidence = 0;
    if (bestCategory !== "UNKNOWN") {
      confidence = Math.round((maxMatches / bestTotalCategoryKeywords) * 100);
      confidence = Math.min(confidence, config.maxConfidenceCap || 95); // Cap at max confidence
    }

    return {
      threat_label: bestCategory,
      confidence: confidence,
      keywords_detected: detectedKeywords,
      transcript: transcript,
      pipeline: pipeline
    };

  } catch (error) {
    logger.error("[ACOUSTIC ERROR]", error);
    throw error;
  }
}
