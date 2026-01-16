import mongoose from "mongoose";

const comboDishSchema = new mongoose.Schema(
  {
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dish",
      required: true,
    },

    // Quantity based on dish unit
    // kg → 1.5
    // litre → 2
    // piece → 10
    quantity: {
      type: Number,
      required: true,
      min: 0.1,
    },
  },
  { _id: false }
);

const comboSchema = new mongoose.Schema({
  cookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  description: {
    type: String,
  },

  dishes: {
    type: [comboDishSchema],
    required: true,
    validate: (v) => v.length > 0,
  },

  // 🔹 Combo Pricing
  price: {
    withMaterials: {
      type: Number,
      required: true,
    },
    withoutMaterials: {
      type: Number,
      required: true,
    },
  },

  imageUrl: {
    type: String,
  },

  minOrderQty: {
    type: Number,
    default: 1,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Combo", comboSchema);
