@echo off
setlocal

echo.
echo ==============================================
echo          SAUTI PORINI — DEMO LAUNCHER
echo ==============================================
echo   Starting all services for recording...
echo ==============================================
echo.

:: Step 1 — start backend
echo [1/3] Starting backend server...
start /b "Backend" node --env-file=.env src\orchestrator.js
timeout /t 3 /nobreak >nul

:: Step 2 — verify backend is healthy
echo [2/3] Checking backend health...
curl -s http://localhost:3000/health
echo.
echo.

:: Step 3 — start frontend
echo [3/3] Starting frontend dashboard...
cd ..\frontend-dashboard
start /b "Frontend" npm run dev
cd ..\agent-backend
timeout /t 4 /nobreak >nul

echo.
echo ==============================================
echo   [OK] Backend:  http://localhost:3000
echo   [OK] Frontend: http://localhost:5173
echo   [OK] Health:   http://localhost:3000/health
echo ==============================================
echo   DEMO COMMANDS:
echo.
echo   Thermal spike (main demo):
echo   node src\simulate\generate_temps.js --fast
echo.
echo   USSD + WAV audio demo:
echo   node src\simulate\simulate_ussd.js --wav
echo.
echo   Fallback resilience demo:
echo   node src\simulate\simulate_ussd.js --fallback-demo
echo ==============================================
echo.

echo [INFO] Press any key to kill all node processes and exit.
pause >nul

taskkill /f /im node.exe >nul 2>&1
echo [SHUTDOWN] Services stopped.
exit /b 0
