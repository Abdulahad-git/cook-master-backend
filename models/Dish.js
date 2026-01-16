// models/Dish.js
import mongoose from "mongoose";

const dishSchema = new mongoose.Schema({
  cookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  name: { type: String, required: true },
  description: { type: String },

  // 🔹 Dish Category
  category: {
    type: String,
    enum: ["sweet", "dessert", "meal", "snack", "drink"],
    required: true,
  },

  // 🔹 Dish Type
  type: {
    type: String,
    enum: ["veg", "non-veg", "egg"],
    required: true,
  },

  unit: {
    type: String,
    enum: ["kg", "litre", "piece"],
    required: true,
  },

  // 🔹 Keep old variable name
  pricePerUnit: {
    withMaterials: {
      type: Number,
      required: true,
    },
    withoutMaterials: {
      type: Number,
      required: true,
    },
  },

  minOrderQty: { type: Number, default: 0 },

  imageUrl: { type: String },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Dish", dishSchema);
