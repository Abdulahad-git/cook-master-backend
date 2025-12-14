import Order from "../models/Order.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { generateQuotationPDF } from "../pdf/builders/quotation.js";

/* ----------------------------- helpers ----------------------------- */
const calculateOrderTotals = (items, orderDiscount, additionalCharges = 0) => {
  let subtotal = 0;

  const computedItems = items.map((item) => {
    const itemSubtotal = item.qty * item.pricePerUnitSnapshot;

    let discountAmount = 0;
    if (item.discount?.type === "rupees") {
      discountAmount = item.discount.amount;
    } else if (item.discount?.type === "percent") {
      discountAmount = (itemSubtotal * item.discount.amount) / 100;
    }

    const finalAmount = itemSubtotal - discountAmount;
    subtotal += finalAmount;

    return {
      ...item,
      itemSubtotal,
      finalAmount,
    };
  });

  let orderDiscountAmount = 0;
  if (orderDiscount?.type === "rupees") {
    orderDiscountAmount = orderDiscount.amount;
  } else if (orderDiscount?.type === "percent") {
    orderDiscountAmount = (subtotal * orderDiscount.amount) / 100;
  }

  const total = subtotal - orderDiscountAmount + Number(additionalCharges || 0);

  return { computedItems, subtotal, total };
};

/* ----------------------------- CREATE ----------------------------- */
// POST /api/orders
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, orderDiscount, additionalCharges } = req.body;

    const { computedItems, subtotal, total } = calculateOrderTotals(
      items,
      orderDiscount,
      additionalCharges
    );

    const [order] = await Order.create(
      [
        {
          ...req.body,
          cookId: req.user.id,
          items: computedItems,
          subtotal,
          total,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(order);
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

/* ----------------------------- READ ALL ----------------------------- */
// GET /api/orders
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ cookId: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ----------------------------- READ ONE ----------------------------- */
// GET /api/orders/:id
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      cookId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ----------------------------- UPDATE ----------------------------- */
// PUT /api/orders/:id
export const updateOrder = async (req, res) => {
  try {
    let updates = { ...req.body };

    if (req.body.items) {
      const { computedItems, subtotal, total } = calculateOrderTotals(
        req.body.items,
        req.body.orderDiscount,
        req.body.additionalCharges
      );

      updates.items = computedItems;
      updates.subtotal = subtotal;
      updates.total = total;
    }

    updates.updatedAt = new Date();

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, cookId: req.user.id },
      updates,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found or unauthorized" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ----------------------------- UPDATE STATUS ----------------------------- */
// PATCH /api/orders/:id/status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, cookId: req.user.id },
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found or unauthorized" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ----------------------------- DELETE ----------------------------- */
// DELETE /api/orders/:id
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndDelete({
      _id: req.params.id,
      cookId: req.user.id,
    });

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found or unauthorized" });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET orders with filters + infinite scroll
 *
 * Query params:
 *  - status=DRAFT|COMPLETED
 *  - fromDate=2025-01-01
 *  - toDate=2025-01-31
 *  - cursor=createdAt (ISO string)
 *  - limit=10
 *
 * Route:
 *  GET /api/orders/query
 */
export const queryOrders = async (req, res) => {
  try {
    const { status, fromDate, toDate, cursor, limit = 10 } = req.query;

    const query = { cookId: req.user.id };

    /* ---------- status filter ---------- */
    if (status) {
      query.status = status;
    }

    /* ---------- date range filter ---------- */
    if (fromDate || toDate) {
      query.createdAt = {};

      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    /* ---------- cursor pagination ---------- */
    if (cursor) {
      query.createdAt = {
        ...(query.createdAt || {}),
        $lt: new Date(cursor),
      };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1); // fetch extra for next cursor

    const hasMore = orders.length > limit;
    if (hasMore) orders.pop();

    const nextCursor =
      orders.length > 0 ? orders[orders.length - 1].createdAt : null;

    res.json({
      data: orders,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderPdf = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Fetch Data
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const cook = await User.findById(order.cookId);
    if (!cook)
      return res.status(404).json({ message: "Cook details not found" });

    // 2. Generate PDF Buffer using the utility function
    const pdfBuffer = await generateQuotationPDF(order, cook);

    // 3. Set Headers for PDF Response
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": `attachment; filename="Quotation-${order.orderNo}.pdf"`,
    });

    // 4. Send the Buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Error:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};
