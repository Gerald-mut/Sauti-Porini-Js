const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
};

/**
 * Structured logger utility.
 *
 * @type {Object}
 * @property {Function} info - Logs informational messages
 * @property {Function} warn - Logs warning messages
 * @property {Function} error - Logs error messages, optionally with a stack trace
 * @property {Function} debug - Logs debug messages
 */
export const logger = {
  info: (message) => console.log(formatMessage("INFO ", message)),
  warn: (message) => console.warn(formatMessage("WARN ", message)),
  error: (message, error) => {
    console.error(formatMessage("ERROR", message));
    if (error && error.stack) {
      console.error(error.stack);
    }
  },
  debug: (message) => console.log(formatMessage("DEBUG", message)),
};

export default logger;
