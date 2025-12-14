// models/Dish.js
import mongoose from "mongoose";

const dishSchema = new mongoose.Schema({
  cookId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  name: { type: String, required: true },
  description: { type: String },

  unit: { type: String, enum: ["kg", "litre", "piece"], required: true },
  pricePerUnit: { type: Number, required: true },
  minOrderQty: { type: Number, default: 0 },

  imageUrl: { type: String },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Dish", dishSchema);
