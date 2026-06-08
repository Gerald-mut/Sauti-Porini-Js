import { classifyAudio } from './services/acousticService.js';
import logger from './utils/logger.js';

const tests = [
  { payload: 'chainsaw motor revving in dense forest area', expected: 'ILLEGAL_LOGGING' },
  { payload: 'smoke and burning smell fire spreading',      expected: 'WILDFIRE' },
  { payload: 'truck engine idling dirt road',              expected: 'VEHICLE_INCURSION' },
  { payload: 'complete silence nothing detected',          expected: 'UNKNOWN' },
];

for (const t of tests) {
  const result = await classifyAudio({ type: 'mock', payload: t.payload });
  const pass = result.threat_label === t.expected;
  logger.info(
    `${pass ? 'success' : 'fail'} "${t.payload.slice(0,40)}..."
     → got: ${result.threat_label} (${result.confidence}%) via ${result.pipeline}
     → expected: ${t.expected}`
  );
}