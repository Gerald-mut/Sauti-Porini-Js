import mongoose from 'mongoose';
import { ZoneState } from '../models/ZoneState.js';
import { Alert } from '../models/alert.js';

async function reset() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const zoneRes = await ZoneState.updateMany({}, { 
      currentState: 'NORMAL', 
      activeThreats: [] 
    });
    const alertRes = await Alert.deleteMany({});
    
    console.log('[RESET] Zones reset to NORMAL:', zoneRes.modifiedCount);
    console.log('[RESET] Alerts cleared:', alertRes.deletedCount);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[RESET ERROR]', error);
    process.exit(1);
  }
}

reset();
