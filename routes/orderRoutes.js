import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  queryOrders,
  getOrderPdf,
} from "../controllers/orderController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/pdf/quotation/:orderId", getOrderPdf);

router.use(authMiddleware);

router.post("/", createOrder);
router.get("/", getMyOrders);
router.get("/query", queryOrders);
// router.get("/pdf/quotation/:orderId", getOrderPdf);
router.get("/:id", getOrderById);
router.put("/:id", updateOrder);
router.patch("/:id/status", updateOrderStatus);
router.delete("/:id", deleteOrder);

export default router;
