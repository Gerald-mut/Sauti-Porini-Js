#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         SAUTI PORINI — DEMO LAUNCHER         ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Starting all services for recording...      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Step 1 — start backend
echo "[1/3] Starting backend server..."
node --env-file=.env src/orchestrator.js &
BACKEND_PID=$!
sleep 3

# Step 2 — verify backend is healthy
echo "[2/3] Checking backend health..."
HEALTH=$(curl -s http://localhost:3000/health)
echo "Health: $HEALTH"
echo ""

# Step 3 — start frontend
echo "[3/3] Starting frontend dashboard..."
cd ../frontend-dashboard && npm run dev &
FRONTEND_PID=$!
sleep 4

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✓ Backend:  http://localhost:3000           ║"
echo "║  ✓ Frontend: http://localhost:5173           ║"
echo "║  ✓ Health:   http://localhost:3000/health    ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  DEMO COMMANDS:                              ║"
echo "║                                              ║"
echo "║  Thermal spike (main demo):                  ║"
echo "║  node src/simulate/generate_temps.js         ║"
echo "║                                              ║"
echo "║  USSD + WAV audio demo:                      ║"
echo "║  node src/simulate/simulate_ussd.js --wav    ║"
echo "║                                              ║"
echo "║  Fallback resilience demo:                   ║"
echo "║  node src/simulate/simulate_ussd.js          ║"
echo "║    --fallback-demo                           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Keep running until Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
