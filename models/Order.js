import mongoose from "mongoose";
import OrderCounter from "./OrderCounter.js";

// --- DISH ITEM SCHEMA ---
// Stores a snapshot of the dish at the time of ordering to prevent
// past orders from changing if a dish price or name is updated later.
const orderItemSchema = new mongoose.Schema({
  dishId: { type: mongoose.Schema.Types.ObjectId, ref: "Dish" },
  nameSnapshot: String,
  unit: { type: String, enum: ["kg", "litre", "piece"] },
  qty: { type: Number, default: 1 },
  pricePerUnitSnapshot: { type: Number, default: 0 },
  pricingMode: {
    type: String,
    enum: ["withMaterials", "withoutMaterials"],
    default: "withMaterials",
  },
  itemSubtotal: { type: Number, default: 0 },
  discount: {
    type: {
      type: String,
      enum: ["rupees", "percent", null],
      default: null,
    },
    amount: { type: Number, default: 0 },
  },
  finalAmount: { type: Number, default: 0 },
});

// --- COMBO ITEM SCHEMA ---
const orderComboSchema = new mongoose.Schema({
  comboId: { type: mongoose.Schema.Types.ObjectId, ref: "Combo" },
  nameSnapshot: String,
  // Record of dishes inside the combo at order time
  dishesSnapshot: [
    {
      dishId: { type: mongoose.Schema.Types.ObjectId, ref: "Dish" },
      name: String,
      quantity: Number,
    },
  ],
  qty: { type: Number, default: 1 },
  pricePerUnitSnapshot: { type: Number, default: 0 },
  pricingMode: {
    type: String,
    enum: ["withMaterials", "withoutMaterials"],
    default: "withMaterials",
  },
  itemSubtotal: { type: Number, default: 0 },
  discount: {
    type: {
      type: String,
      enum: ["rupees", "percent", null],
      default: null,
    },
    amount: { type: Number, default: 0 },
  },
  finalAmount: { type: Number, default: 0 },
});

// --- MAIN ORDER SCHEMA ---
const orderSchema = new mongoose.Schema(
  {
    cookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimized for filtering orders by cook
    },
    orderNo: {
      type: String,
      unique: true,
      index: true,
    },
    clientName: { type: String, required: true, trim: true },
    clientPhone: { type: String, trim: true },
    eventDate: { type: Date },
    notes: { type: String },

    orderType: {
      type: String,
      enum: ["WITH_MATERIAL", "WITHOUT_MATERIAL"],
      default: "WITH_MATERIAL",
      required: true,
    },

    // Individual Dishes
    items: [orderItemSchema],

    // Selected Combos
    combos: [orderComboSchema],

    orderDiscount: {
      type: {
        type: String,
        enum: ["rupees", "percent", null],
        default: null,
      },
      amount: { type: Number, default: 0 },
    },

    additionalCharges: { type: Number, default: 0 },

    subtotal: { type: Number, default: 0 }, // Sum of (items + combos)
    total: { type: Number, default: 0 }, // Final amount after order-level discount

    status: {
      type: String,
      enum: [
        "DRAFT",
        "QUOTED",
        "CLIENT_APPROVED",
        "CLIENT_REJECTED",
        "CANCELLED",
        "IN_PROGRESS",
        "COMPLETED",
      ],
      default: "DRAFT",
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

/**
 * PRE-SAVE HOOK
 * Automatically generates a sequential order number (e.g., ORD-00001)
 * scoped specifically to the cook creating the order.
 */
orderSchema.pre("save", async function () {
  // Only run this logic if it's a new document and doesn't have an orderNo yet
  if (!this.isNew || this.orderNo) return;

  try {
    const counter = await OrderCounter.findOneAndUpdate(
      { cookId: this.cookId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.orderNo = `ORD-${String(counter.seq).padStart(5, "0")}`;
  } catch (error) {
    // Throwing error inside an async pre-save hook effectively calls next(error)
    throw error;
  }
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
