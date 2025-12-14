import express from "express";
import {
  createDish,
  getMyDishes,
  getDishById,
  updateDish,
  deleteDish,
} from "../controllers/dishController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createDish);
router.get("/", getMyDishes);
router.get("/:id", getDishById);
router.put("/:id", updateDish);
router.delete("/:id", deleteDish);

export default router;
