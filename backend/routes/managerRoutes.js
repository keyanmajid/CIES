// backend/routes/managerRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Interaction from "../models/Interaction.js"; // If you have a model for chat/call interactions
import { verifyUser, verifyRole } from "../middlewares/auth.js";

const router = express.Router();

// ----------------------
// CREATE EMPLOYEE
// ----------------------
router.post("/employees", verifyUser, verifyRole(["manager"]), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const employee = new User({ name, email, password: hashedPassword, role: "employee", score: 100 });
    await employee.save();

    res.status(201).json({ success: true, message: "Employee created successfully", employee });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ----------------------
// GET ALL EMPLOYEES
// ----------------------
router.get("/employees", verifyUser, verifyRole(["manager"]), async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" }).select("-password"); // Exclude password
    res.json({ success: true, employees });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching employees", error: error.message });
  }
});

// ----------------------
// FIRE / DELETE EMPLOYEE
// ----------------------
router.delete("/employees/:id", verifyUser, verifyRole(["manager"]), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Employee fired successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting employee", error: error.message });
  }
});

// ----------------------
// UPDATE EMPLOYEE SCORE
// ----------------------
router.put("/employees/:id/score", verifyUser, verifyRole(["manager"]), async (req, res) => {
  try {
    const { delta } = req.body; // Positive or negative number

    if (typeof delta !== "number") {
      return res.status(400).json({ success: false, message: "Delta must be a number" });
    }

    const employee = await User.findById(req.params.id);
    if (!employee || employee.role !== "employee") {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    employee.score += delta;

    // Optional: Auto-fire if score drops to 0 or below
    let fired = false;
    if (employee.score <= 0) {
      await User.findByIdAndDelete(employee._id);
      fired = true;
    } else {
      await employee.save();
    }

    res.json({
      success: true,
      message: fired ? "Employee score dropped to 0 and was fired" : "Employee score updated",
      employee: fired ? null : employee
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating score", error: error.message });
  }
});

// ----------------------
// GET EMPLOYEE INTERACTIONS (OPTIONAL)
// ----------------------
router.get("/interactions/:employeeId", verifyUser, verifyRole(["manager"]), async (req, res) => {
  try {
    const interactions = await Interaction.find({ employeeId: req.params.employeeId });
    res.json({ success: true, interactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
