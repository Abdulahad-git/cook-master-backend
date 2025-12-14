import mongoose from "mongoose";

const orderCounterSchema = new mongoose.Schema({
  cookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model("OrderCounter", orderCounterSchema);
