import Order from "../models/Order.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { generateQuotationPDF } from "../pdf/builders/quotation.js";

/* ----------------------------- helpers ----------------------------- */

/**
 * Shared logic to calculate totals for a single line item (Dish or Combo)
 */
const calculateLineItem = (item) => {
  const itemSubtotal = (item.qty || 0) * (item.pricePerUnitSnapshot || 0);

  let discountAmount = 0;
  if (item.discount?.type === "rupees") {
    discountAmount = item.discount.amount || 0;
  } else if (item.discount?.type === "percent") {
    discountAmount = (itemSubtotal * (item.discount.amount || 0)) / 100;
  }

  const finalAmount = itemSubtotal - discountAmount;

  return {
    ...item,
    itemSubtotal,
    finalAmount,
  };
};

const calculateOrderTotals = (
  items = [],
  combos = [],
  orderDiscount,
  additionalCharges = 0
) => {
  let subtotal = 0;

  // 1. Process Dishes
  const computedItems = items.map((item) => {
    const computed = calculateLineItem(item);
    subtotal += computed.finalAmount;
    return computed;
  });

  // 2. Process Combos
  const computedCombos = combos.map((combo) => {
    const computed = calculateLineItem(combo);
    subtotal += computed.finalAmount;
    return computed;
  });

  // 3. Process Global Order Discount
  let orderDiscountAmount = 0;
  if (orderDiscount?.type === "rupees") {
    orderDiscountAmount = orderDiscount.amount || 0;
  } else if (orderDiscount?.type === "percent") {
    orderDiscountAmount = (subtotal * (orderDiscount.amount || 0)) / 100;
  }

  const total = subtotal - orderDiscountAmount + Number(additionalCharges || 0);

  return {
    computedItems,
    computedCombos,
    subtotal,
    total,
  };
};

/* ----------------------------- CREATE ----------------------------- */
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Destructure combos from request body
    const {
      items = [],
      combos = [],
      orderDiscount,
      additionalCharges,
      orderType,
    } = req.body;

    // Calculate everything
    const { computedItems, computedCombos, subtotal, total } =
      calculateOrderTotals(items, combos, orderDiscount, additionalCharges);

    const [order] = await Order.create(
      [
        {
          ...req.body,
          cookId: req.user.id,
          orderType: orderType || "WITH_MATERIAL",
          items: computedItems,
          combos: computedCombos, // 🔹 Added combos here
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
    console.error("Order Creation Error:", error);
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
export const updateOrder = async (req, res) => {
  try {
    const { items, combos, orderDiscount, additionalCharges } = req.body;
    let updates = { ...req.body };

    // 1. Check if any pricing-related fields are being updated
    const isPricingUpdate =
      items !== undefined ||
      combos !== undefined ||
      orderDiscount !== undefined ||
      additionalCharges !== undefined;

    if (isPricingUpdate) {
      // 2. Fetch the existing order to get current values for fields not provided in the request
      // This ensures that if you update "items", the "combos" already in the DB aren't lost in the math.
      const existingOrder = await Order.findOne({
        _id: req.params.id,
        cookId: req.user.id,
      });

      if (!existingOrder) {
        return res
          .status(404)
          .json({ message: "Order not found or unauthorized" });
      }

      // 3. Use new values from req.body if they exist, otherwise fallback to existing values in DB
      const finalItems = items ?? existingOrder.items;
      const finalCombos = combos ?? existingOrder.combos;
      const finalDiscount = orderDiscount ?? existingOrder.orderDiscount;
      const finalCharges = additionalCharges ?? existingOrder.additionalCharges;

      // 4. Recalculate using the helper function
      const { computedItems, computedCombos, subtotal, total } =
        calculateOrderTotals(
          finalItems,
          finalCombos,
          finalDiscount,
          finalCharges
        );

      // 5. Apply calculated values to the update object
      updates.items = computedItems;
      updates.combos = computedCombos;
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
    console.error("Order Update Error:", error);
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
 * Query params updated to include orderType
 */
export const queryOrders = async (req, res) => {
  try {
    const {
      status,
      fromDate,
      toDate,
      cursor,
      limit = 10,
      orderType,
    } = req.query;

    const query = { cookId: req.user.id };

    /* ---------- status filter ---------- */
    if (status) {
      query.status = status;
    }

    /* ---------- order type filter ---------- */
    if (orderType) {
      query.orderType = orderType; // 🔹 Allow filtering by WITH_MATERIAL or WITHOUT_MATERIAL
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
      .limit(Number(limit) + 1);

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
