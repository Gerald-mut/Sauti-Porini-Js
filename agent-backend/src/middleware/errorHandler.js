/**
 * @file errorHandler.js
 * @description Global Express error handler.
 * @module middleware/errorHandler
 */
import logger from "../utils/logger.js";

/**
 * Global error handler middleware.
 *
 * @param {Error} err - The error object
 * @param {Object} req - The Express request object
 * @param {Object} res - The Express response object
 * @param {Function} next - The next middleware function
 * @returns {void}
 */
export default function errorHandler(err, req, res, next) {
  logger.error(err.message || "Internal server error", err);

  const status = err.status || 500;
  const errorResponse = {
    error: err.message || "Internal server error",
    status,
  };

  if (process.env.NODE_ENV !== "production") {
    errorResponse.stack = err.stack;
  }

  res.status(status).json(errorResponse);
}
