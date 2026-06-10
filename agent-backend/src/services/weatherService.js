/**
 * @file weatherService.js
 * @description Service for fetching live weather data from OpenWeather API.
 * @module services/weatherService
 */
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { getCircuitBreaker } from "../utils/circuitBreaker.js";

const weatherBreaker = getCircuitBreaker('openweather', {
  failureThreshold: config.weatherFailureThreshold,
  callTimeoutMs: config.weatherCallTimeoutMs,
  fallback: (error) => {
    logger.warn(
      `[WEATHER FALLBACK] OpenWeather unavailable — ` +
      `returning last known or default conditions. ` +
      `Reason: ${error.message}`
    )
    return {
      wind_speed_kmh: 0,
      wind_direction_degrees: 0,
      humidity_percent: 65,
      temp_celsius: 25,
      source: 'fallback_default'
    }
  }
});

const getLiveWeatherInternal = async (lat, lon) => {
  if (!config.openWeatherKey) {
    throw new Error("Missing OPENWEATHER_API_KEY");
  }
  const weatherUrl = `${config.openWeatherBaseUrl}?lat=${lat}&lon=${lon}&appid=${config.openWeatherKey}&units=metric`;
  const res = await fetch(weatherUrl);
  if (!res.ok) throw new Error(`Weather HTTP Error: ${res.status}`);
  const data = await res.json();
  
  return {
    wind_speed_kmh: Math.round((data.wind?.speed || 0) * 3.6),
    wind_direction_degrees: data.wind?.deg || 0,
    humidity_percent: data.main?.humidity || 0,
    temp_celsius: Math.round(data.main?.temp || 0)
  };
};

/**
 * Fetches live weather conditions for a given latitude and longitude.
 *
 * @param {number} lat - Latitude coordinate
 * @param {number} lon - Longitude coordinate
 * @returns {Promise<Object>} Weather data containing wind speed, direction, humidity, and temperature
 * @throws {Error} When the API key is missing or the external request fails
 */
export const getLiveWeather = async (lat, lon) => {
  return weatherBreaker.fire(getLiveWeatherInternal, lat, lon);
};
