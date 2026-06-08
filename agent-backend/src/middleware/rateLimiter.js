/**
 * @file rateLimiter.js
 * @description Express rate limiter configurations.
 * @module middleware/rateLimiter
 */
import rateLimit from "express-rate-limit";
import config from "../config/index.js";

/**
 * Rate limiter for USSD endpoints.
 *
 * @type {Function}
 */
export const ussdLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: { error: "Too many requests. Please wait before submitting again." },
  standardHeaders: true,
  legacyHeaders: false,
});
