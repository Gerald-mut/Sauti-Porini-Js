/**
 * @file circuitBreaker.js
 * @description Circuit breaker utility (placeholder for Phase D).
 * @module utils/circuitBreaker
 */

import logger from './logger.js';

export class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name;
    this.failureThreshold = opts.failureThreshold ?? 3;
    this.successThreshold = opts.successThreshold ?? 2;
    this.timeoutMs = opts.timeoutMs ?? 30000;
    this.callTimeoutMs = opts.callTimeoutMs ?? 15000;
    this.fallback = opts.fallback ?? null;

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastError = null;
    this.totalCalls = 0;
    this.totalFailures = 0;
    this.totalFallbacks = 0;
  }

  async fire(fn, ...args) {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.timeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info(`[CIRCUIT:${this.name}] OPEN → HALF_OPEN — allowing trial call`);
      } else {
        this.totalFallbacks++;
        logger.warn(`[CIRCUIT:${this.name}] OPEN — blocked, returning fallback`);
        if (this.fallback) {
          return this.fallback(this.lastError, ...args);
        } else {
          throw new Error(`Circuit ${this.name} is OPEN: ${this.lastError?.message}`);
        }
      }
    }

    // Call allowed (CLOSED or HALF_OPEN)
    this.totalCalls++;

    try {
      // Note: the underlying call is not cancelled, only abandoned
      const result = await Promise.race([
        fn(...args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Call timeout after ${this.callTimeoutMs}ms`)), this.callTimeoutMs)
        )
      ]);

      // On success
      this.failureCount = 0;
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.state = 'CLOSED';
          this.successCount = 0;
          this.failureCount = 0;
          this.lastFailureTime = null;
          this.lastError = null;
          logger.info(`[CIRCUIT:${this.name}] HALF_OPEN → CLOSED — recovered ✓`);
        }
      }
      return result;

    } catch (error) {
      // On failure
      this.failureCount++;
      this.totalFailures++;
      this.lastFailureTime = Date.now();
      this.lastError = error;
      
      if (this.state === 'HALF_OPEN') {
        this.state = 'OPEN';
        this.successCount = 0;
        logger.warn(`[CIRCUIT:${this.name}] HALF_OPEN → OPEN — trial failed`);
      } else {
        logger.warn(`[CIRCUIT:${this.name}] Failure ${this.failureCount}/${this.failureThreshold}: ${error.message}`);
        if (this.failureCount >= this.failureThreshold) {
          this.state = 'OPEN';
          logger.warn(`[CIRCUIT:${this.name}] CLOSED → OPEN — threshold reached ✗`);
        }
      }

      throw error;
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successThreshold: this.successThreshold,
      failureThreshold: this.failureThreshold,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalFallbacks: this.totalFallbacks,
      lastError: this.lastError?.message || null,
      lastFailureTime: this.lastFailureTime,
      uptimePercent: this.totalCalls > 0 
        ? ((this.totalCalls - this.totalFailures) / this.totalCalls * 100).toFixed(1) 
        : '100.0'
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastError = null;
    this.totalCalls = 0;
    this.totalFailures = 0;
    this.totalFallbacks = 0;
    logger.info(`[CIRCUIT:${this.name}] Manually reset to CLOSED`);
  }
}

const registry = new Map();

export function getCircuitBreaker(name, opts = {}) {
  if (!registry.has(name)) {
    registry.set(name, new CircuitBreaker(name, opts));
  }
  return registry.get(name);
}

export function getAllBreakerStatuses() {
  return Array.from(registry.values()).map(b => b.getStatus());
}
