import { Router } from "express";
import { analyze, triggerFire, iotAlert, getAlerts, demoReset, thermalAlert } from "../controllers/miscController.js";

/**
 * Express router for miscellaneous demo and alert endpoints.
 * @type {Router}
 */
const router = Router();

router.post("/api/analyze", analyze);
router.post("/api/demo/trigger-fire", triggerFire);
router.post("/api/iot", iotAlert);
router.post("/api/thermal", thermalAlert);
router.get("/api/alerts", getAlerts);
router.get("/api/demo/reset", demoReset);

export default router;
