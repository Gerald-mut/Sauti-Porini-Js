// src/models/ZoneState.js
import mongoose from 'mongoose';

const ZoneStateSchema = new mongoose.Schema({
  sectorId: { type: String, required: true, unique: true }, 
  currentState: { 
    type: String, 
    enum: ['NORMAL', 'WATCH', 'ALERT'], 
    default: 'NORMAL' 
  },
  // We store WHY it's in this state so the AI can use it later
  activeThreats: [{ type: String }], 
  weatherContext: {
    windSpeed: Number,
    temperature: Number
  },
  lastUpdated: { type: Date, default: Date.now }
});

export const ZoneState = mongoose.model('ZoneState', ZoneStateSchema);