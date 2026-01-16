import express from "express";
import {
  createCombo,
  getCombosByCook,
  getComboById,
  updateCombo,
  deleteCombo,
} from "../controllers/comboController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 Protected routes
router.post("/", authMiddleware, createCombo);
router.get("/", authMiddleware, getCombosByCook);
router.get("/:id", authMiddleware, getComboById);
router.put("/:id", authMiddleware, updateCombo);
router.delete("/:id", authMiddleware, deleteCombo);

export default router;
