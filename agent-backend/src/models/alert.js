import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  sectorId: String,
  threatType: String, //for fire, logging or ussd
  threat_label: String,
  lat: Number,
  lon: Number,
  confidence: String,
  phone_number: String,
  blockchain_proof: String,
  sound_type: String,
  dispatchMessage: String,
  dispatch: String,
  reasoning: [String],
  locale: String,
  sensor_id: String,
  detected_at: { type: Date, default: Date.now },
  fire_spread: {
    spread_radius_km: Number,
    primary_bearing_degrees: Number,
    estimated_affected_area_km2: Number
  },
  timestamp: { type: Date, default: Date.now }
});

export const Alert = mongoose.model('Alert', AlertSchema);