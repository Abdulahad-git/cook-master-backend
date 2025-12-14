import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import dishRoutes from "./routes/dishRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/auth", authRoutes);
app.use("/dish", dishRoutes);
app.use("/order", orderRoutes);
app.use("/user", userRoutes);

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(process.env.PORT || 5000, () =>
  console.log(`Server running on port ${process.env.PORT || 5000}`)
);
