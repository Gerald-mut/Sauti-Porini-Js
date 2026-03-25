import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  sectorId: String,
  threatType: String, //for fire, logging or ussd
  lat: Number,
  lon: Number,
  confidence: String,
  phone_number: String,
  blockchain_proof: String,
  sound_type: String,
  dispatchMessage: String,
  timestamp: { type: Date, default: Date.now }
});

export const Alert = mongoose.model('Alert', AlertSchema);