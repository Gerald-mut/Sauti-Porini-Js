import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  sectorId: String,
  threatType: String, //for fire, logging or ussd
  confidence: Number,
  status: { type: String, default: 'Unverified' }, //can be unverified, resolved or confirmed
  dispatchMessage: String,
  timestamp: { type: Date, default: Date.now }
});

export const Alert = mongoose.model('Alert', AlertSchema);