import logger from "./utils/logger.js";

// Simulates what the USSD webhook route handler should be doing
function extractLocale(ussdInput) {
  if (ussdInput.startsWith('*sw')) return 'sw';
  if (ussdInput.startsWith('*en')) return 'en';
  return 'en'; // default
}

const cases = [
  { input: '*sw report fire sector 4', expected: 'sw' },
  { input: '*en report fire sector 4', expected: 'en' },
  { input: 'report fire sector 4',     expected: 'en' }, // no prefix → default
  { input: '*sw',                      expected: 'sw' }, // prefix only
];

for (const c of cases) {
  const result = extractLocale(c.input);
  const pass = result === c.expected;
  logger.info(`${pass ? '✓' : '✗'} Input: "${c.input}" → got: ${result} | expected: ${c.expected}`);
}