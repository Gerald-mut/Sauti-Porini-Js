#!/bin/bash
echo "[RESET] Resetting all zones to NORMAL state..."
node --env-file=.env -e "
import('./src/models/Zone.js').then(async ({ default: Zone }) => {
  const mongoose = await import('mongoose')
  await mongoose.default.connect(process.env.MONGODB_URI)
  const result = await Zone.updateMany(
    {}, 
    { state: 'NORMAL', eventHistory: [] }
  )
  console.log('[RESET] Zones reset:', result.modifiedCount)
  await mongoose.default.disconnect()
  process.exit(0)
})
"
echo "[RESET] Complete — all zones back to NORMAL"
