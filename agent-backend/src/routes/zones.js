import { Router } from "express";
import { getZones, getHealth } from "../controllers/zonesController.js";

/**
 * Express router for zone and health endpoints.
 * @type {Router}
 */
const router = Router();

router.get("/zones", getZones);
// The health endpoint is mounted as GET /health in orchestrator.js
// Wait, the prompt says "register GET /api/zones and GET /health"
// So maybe I'll mount `/` for health and `/api/zones` for zones.
// No, the prompt says "register routes: app.use('/ussd', ussdRouter), app.use('/', zonesRouter)".
// If `app.use('/', zonesRouter)` is used, then inside `zonesRouter` I should have `/api/zones` and `/health`.

router.get("/api/zones", getZones);
router.get("/health", getHealth);

export default router;
