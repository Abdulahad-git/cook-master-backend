// models/Expense.js
import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  cookId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },

  title: { type: String, required: true },
  amount: { type: Number, required: true },
  notes: String,

  expenseDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Expense", expenseSchema);
