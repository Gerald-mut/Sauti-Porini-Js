import sdk from 'microsoft-cognitiveservices-speech-sdk';

const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY,
  process.env.AZURE_SPEECH_REGION
);

const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

synthesizer.speakTextAsync(
  'chainsaw motor revving in dense forest',
  result => {
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      console.log('✓ Azure Speech connection working — audio synthesized');
    } else {
      console.error('✗ Synthesis failed:', result.errorDetails);
    }
    synthesizer.close();
  },
  err => {
    console.error('✗ Connection failed:', err);
    synthesizer.close();
  }
);