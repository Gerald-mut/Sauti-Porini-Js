import { Router } from "express";
import { ussdLimiter } from "../middleware/rateLimiter.js";
import { handleUssd } from "../controllers/ussdController.js";

/**
 * Express router for USSD endpoints.
 * @type {Router}
 */
const router = Router();

router.post("/", ussdLimiter, handleUssd);

export default router;
