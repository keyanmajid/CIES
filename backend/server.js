// server.js - UPDATED VERSION
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import cartRoutes from "./routes/cartRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Make sure these routes are correctly mounted
app.use("/api/cart", cartRoutes);
app.use("/api/auth", authRoutes);

// Test routes to verify API is working
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});


// Root route

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ DB Connected"))
.catch(err => console.error("❌ DB Connection Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));