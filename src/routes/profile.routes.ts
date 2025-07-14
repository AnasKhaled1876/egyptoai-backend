import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.js";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";

const router = Router();

/**
 * @route   GET /api/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get("/", authenticateToken, getProfile);

/**
 * @route   PUT /api/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put("/", authenticateToken, updateProfile);

export default router;
