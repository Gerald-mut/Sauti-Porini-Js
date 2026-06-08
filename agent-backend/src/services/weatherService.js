/**
 * @file weatherService.js
 * @description Service for fetching live weather data from OpenWeather API.
 * @module services/weatherService
 */
import config from "../config/index.js";
import logger from "../utils/logger.js";

/**
 * Fetches live weather conditions for a given latitude and longitude.
 *
 * @param {number} lat - Latitude coordinate
 * @param {number} lon - Longitude coordinate
 * @returns {Promise<Object>} Weather data containing wind speed, direction, humidity, and temperature
 * @throws {Error} When the API key is missing or the external request fails
 */
export const getLiveWeather = async (lat, lon) => {
  try {
    if (!config.openWeatherKey) {
      throw new Error("Missing OPENWEATHER_API_KEY");
    }
    const weatherUrl = `${config.openWeatherBaseUrl}?lat=${lat}&lon=${lon}&appid=${config.openWeatherKey}&units=metric`;
    const res = await fetch(weatherUrl);
    const data = await res.json();
    
    return {
      wind_speed_kmh: Math.round((data.wind?.speed || 0) * 3.6),
      wind_direction_degrees: data.wind?.deg || 0,
      humidity_percent: data.main?.humidity || 0,
      temp_celsius: Math.round(data.main?.temp || 0)
    };
  } catch (error) {
    logger.error("Failed to fetch live weather:", error);
    throw error;
  }
};
