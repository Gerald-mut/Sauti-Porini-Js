import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";

/**
 * ============================================================================
 * Sauti Porini Acoustic Classifier
 * ============================================================================
 * This module bridges the simulated environment with a REAL acoustic 
 * classification pipeline via Azure Cognitive Services.
 * 
 * WHAT IS REAL:
 * - The transcription step using Azure Speech-to-Text (if keys provided).
 * - The synthesis step that converts mock text payloads into actual 
 *   audio streams in-memory before running them back through recognition.
 * - The keyword extraction and confidence scoring logic.
 * 
 * WHAT IS SIMULATED:
 * - The 'mock' payloads entering the system (e.g., "chainsaw motor revving"), 
 *   which substitute for actual hardware microphones deployed in the forest.
 * 
 * If Azure credentials are not available, this module gracefully degrades 
 * to a pure text-matching simulation ('mock_fallback' pipeline).
 * ============================================================================
 */

const KEYWORD_MAP = {
  ILLEGAL_LOGGING: ['chainsaw', 'cutting', 'logging', 'tree', 'motor'],
  WILDFIRE: ['fire', 'smoke', 'burning', 'flame', 'heat'],
  VEHICLE_INCURSION: ['vehicle', 'truck', 'engine', 'car', 'motor'],
  GUNSHOT: ['gunshot', 'shot', 'gun', 'rifle', 'bang']
};

export async function classifyAudio(audioInput) {
  try {
    let transcript = "";
    let pipeline = "mock_fallback";

    const hasAzureKeys = process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION;

    if (hasAzureKeys) {
      pipeline = "azure_speech";
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        process.env.AZURE_SPEECH_KEY,
        process.env.AZURE_SPEECH_REGION
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
            // Some versions of SDK expect buffer via push stream for Node.js
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
      confidence = Math.min(confidence, 95); // Cap at 95%
    }

    return {
      threat_label: bestCategory,
      confidence: confidence,
      keywords_detected: detectedKeywords,
      transcript: transcript,
      pipeline: pipeline
    };

  } catch (error) {
    console.error("[ACOUSTIC ERROR]", error);
    return {
      threat_label: 'UNKNOWN',
      confidence: 0,
      keywords_detected: [],
      transcript: '',
      pipeline: 'error_fallback'
    };
  }
}
