import express from "express";
import {
  getMyProfile,
  updateMyProfile,
} from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

/**
 * @route   GET /api/users/me
 * @desc    Get logged-in user profile
 * @access  Private
 */
router.get("/me", getMyProfile);

/**
 * @route   PUT /api/users/me
 * @desc    Update logged-in user profile
 * @access  Private
 */
router.put("/me", updateMyProfile);

export default router;
