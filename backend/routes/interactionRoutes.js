import express from "express";
import Interaction from "../models/Interaction.js";
import User from "../models/User.js";
import { verifyUser, verifyRole } from "../middlewares/auth.js";

const router = express.Router();

// RECORD NEW INTERACTION
router.post("/", verifyUser, verifyRole(["employee", "manager"]), async (req, res) => {
  try {
    const { customerName, type, transcript, sentimentScore } = req.body;

    if (!["chat", "call"].includes(type)) {
      return res.status(400).json({ message: "Invalid interaction type" });
    }

    // Points deduction
    let pointsDeducted = 0;
    if (sentimentScore < 0) pointsDeducted = Math.ceil(Math.abs(sentimentScore) * 10);

    // Parse messages
    const messages = transcript.map(msg => ({
      sender: msg.sender,
      text: msg.text,
      length: msg.text.length,
      wordCount: msg.text.split(/\s+/).length
    }));

    // Generate features
    const totalCustomerMessages = messages.filter(m => m.sender === "customer").length;
    const totalEmployeeMessages = messages.filter(m => m.sender === "employee").length;
    const avgMessageLength = messages.reduce((acc, m) => acc + m.length, 0) / messages.length;
    const badLanguageCount = messages.filter(m => /badword|curse/.test(m.text.toLowerCase())).length;

    const features = {
      totalCustomerMessages,
      totalEmployeeMessages,
      avgMessageLength,
      sentimentScore,
      badLanguageCount
    };

    const interaction = new Interaction({
      employeeId: req.user.id,
      customerName,
      type,
      messages,
      sentimentScore,
      pointsDeducted,
      features,
      satisfaction: null
    });

    await interaction.save();

    // Update employee score
    const employee = await User.findById(req.user.id);
    let fired = false;
    if (employee) {
      employee.score -= pointsDeducted;
      if (employee.score <= 0) {
        await User.findByIdAndDelete(employee._id);
        fired = true;
      } else {
        await employee.save();
      }
    }

    res.json({
      success: true,
      interaction,
      employee: fired ? null : employee,
      fired
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// GET ALL INTERACTIONS (for ML training or admin)
router.get("/", verifyUser, verifyRole(["manager", "admin"]), async (req, res) => {
  try {
    const interactions = await Interaction.find().populate("employeeId", "name email");
    res.json({ success: true, interactions });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// UPDATE CUSTOMER SATISFACTION AFTER ML PREDICTION
router.put("/:id/satisfaction", verifyUser, verifyRole(["manager", "admin"]), async (req, res) => {
  try {
    const { satisfaction } = req.body; // "satisfied", "neutral", "unsatisfied"
    const interaction = await Interaction.findByIdAndUpdate(
      req.params.id,
      { satisfaction },
      { new: true }
    );
    if (!interaction) return res.status(404).json({ message: "Interaction not found" });
    res.json({ success: true, interaction });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

export default router;
