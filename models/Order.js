// models/Order.js
import mongoose from "mongoose";
import OrderCounter from "./OrderCounter.js";

const orderItemSchema = new mongoose.Schema({
  dishId: { type: mongoose.Schema.Types.ObjectId, ref: "Dish" },

  nameSnapshot: String,
  unit: { type: String, enum: ["kg", "litre", "piece"] },

  qty: Number,
  pricePerUnitSnapshot: Number,

  itemSubtotal: Number,

  discount: {
    type: {
      type: String,
      enum: ["rupees", "percent", null],
      default: null,
    },
    amount: { type: Number, default: 0 },
  },

  finalAmount: Number,
});

const orderSchema = new mongoose.Schema({
  cookId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderNo: {
    type: String,
    // unique: true,
    index: true,
  },

  clientName: { type: String, required: true },
  clientPhone: { type: String },
  eventDate: { type: Date },
  notes: { type: String },

  items: [orderItemSchema],

  orderDiscount: {
    type: {
      type: String,
      enum: ["rupees", "percent", null],
      default: null,
    },
    amount: { type: Number, default: 0 },
  },

  additionalCharges: { type: Number, default: 0 },

  subtotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },

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

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre("save", async function () {
  // only generate orderNo for new documents
  if (!this.isNew || this.orderNo) return;

  const counter = await OrderCounter.findOneAndUpdate(
    { cookId: this.cookId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.orderNo = `ORD-${String(counter.seq).padStart(5, "0")}`;
});

export default mongoose.model("Order", orderSchema);
