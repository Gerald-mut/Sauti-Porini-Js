/**
 * @file acousticService.js
 * @description Service for classifying acoustic sensor data using Azure Cognitive Services.
 * @module services/acousticService
 */
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { getCircuitBreaker } from "../utils/circuitBreaker.js";

const KEYWORD_MAP = {
  ILLEGAL_LOGGING: ['chainsaw', 'cutting', 'logging', 'tree', 'motor'],
  WILDFIRE: ['fire', 'smoke', 'burning', 'flame', 'heat'],
  VEHICLE_INCURSION: ['vehicle', 'truck', 'engine', 'car', 'motor'],
  GUNSHOT: ['gunshot', 'shot', 'gun', 'rifle', 'bang']
};

const speechBreaker = getCircuitBreaker('azure-speech', {
  failureThreshold: config.speechFailureThreshold,
  callTimeoutMs: config.speechCallTimeoutMs,
  fallback: (error, audioInput) => {
    logger.warn(
      '[ACOUSTIC FALLBACK] Azure Speech unavailable — ' +
      `using keyword matching only. Reason: ${error.message}`
    )
    const transcript = audioInput.type === 'mock' ? audioInput.payload : ''
    return performKeywordMatching(transcript, 'mock_fallback')
  }
});

async function performSpeechRecognition(audioInput) {
  let transcript = "";
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    config.azureSpeechKey,
    config.azureSpeechRegion
  );
  speechConfig.speechRecognitionLanguage = "en-US";

  if (audioInput.type === "mock") {
    transcript = await new Promise((resolve, reject) => {
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
              (err) => {
                recognizer.close();
                reject(err);
              }
            );
          } else {
            resolve(audioInput.payload);
          }
        },
        (err) => {
          synthesizer.close();
          reject(err);
        }
      );
    });
  } else if (audioInput.type === "file") {
    transcript = await new Promise((resolve, reject) => {
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
          (err) => {
            recognizer.close();
            reject(err);
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }
  return transcript;
}

function performKeywordMatching(transcript, pipeline) {
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

  let confidence = 0;
  if (bestCategory !== "UNKNOWN") {
    confidence = Math.round((maxMatches / bestTotalCategoryKeywords) * 100);
    confidence = Math.min(confidence, config.maxConfidenceCap || 95);
  }

  return {
    threat_label: bestCategory,
    confidence: confidence,
    keywords_detected: detectedKeywords,
    transcript: transcript,
    pipeline: pipeline
  };
}

/**
 * Classifies an audio input stream or mock payload against known threat keywords.
 *
 * @param {Object} audioInput - Audio input data object containing type and payload
 * @returns {Promise<Object>} The classification result including threat label and confidence
 * @throws {Error} Re-throws unexpected errors
 */
export async function classifyAudio(audioInput) {
  try {
    const hasAzureKeys = config.azureSpeechKey && config.azureSpeechRegion;
    let resultOrTranscript;

    if (hasAzureKeys) {
      resultOrTranscript = await speechBreaker.fire(performSpeechRecognition, audioInput);
    } else {
      resultOrTranscript = audioInput.type === "mock" ? audioInput.payload : "";
    }

    // If result is an object, it's the fallback result
    if (typeof resultOrTranscript === 'object' && resultOrTranscript !== null) {
      return resultOrTranscript;
    }

    const transcript = resultOrTranscript;
    const pipeline = hasAzureKeys ? "azure_speech" : "mock_fallback";
    return performKeywordMatching(transcript, pipeline);

  } catch (error) {
    logger.error("[ACOUSTIC ERROR]", error);
    throw error;
  }
}
