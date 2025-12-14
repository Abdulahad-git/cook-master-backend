// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },

  businessName: { type: String },
  address: { type: String },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
