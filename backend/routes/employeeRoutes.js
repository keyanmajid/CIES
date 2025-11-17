import express from "express";
import User from "../models/User.js";
import { verifyUser, verifyRole } from "../middlewares/auth.js";

const router = express.Router();

// ✅ Get employee details and score
router.get("/dashboard", verifyUser, verifyRole(["employee"]), async (req, res) => {
  try {
    const employee = await User.findById(req.user.id).select("name score email");
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: "Error fetching employee data", error });
  }
});

export default router;
