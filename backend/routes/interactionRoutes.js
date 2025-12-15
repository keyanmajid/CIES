import express from "express";
import Interaction from "../models/Interaction.js";
import User from "../models/User.js";
import ToxicityService from "../service/toxicityService.js"; // Use new service
import ToxicityScheduler from "../schedulers/toxicityScheduler.js";
import { verifyUser, verifyRole } from "../middlewares/auth.js";

const router = express.Router();

// 🔥 COMPLETE CHAT WITH IMMEDIATE TOXICITY ANALYSIS
router.post("/complete-with-analysis/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    
    console.log(`🎯 COMPLETING CHAT: Customer ${customerId}`);
    
    // Find the active interaction
    const interaction = await Interaction.findOne({
      customerId,
      status: { $ne: "completed" }
    }).sort({ createdAt: -1 });
    
    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: "No active interaction found"
      });
    }
    
    console.log(`📊 Found interaction ${interaction._id} for employee ${interaction.employeeId}`);
    
    // Get employee BEFORE for comparison
    const employeeBefore = interaction.employeeId ? 
      await User.findById(interaction.employeeId) : null;
    
    console.log(`👤 Employee before: Score ${employeeBefore?.score}`);
    
    // Mark as completed
    interaction.status = "completed";
    interaction.updatedAt = new Date();
    interaction.completedAt = new Date();
    await interaction.save();
    
    console.log(`✅ Chat marked as completed`);
    
    // 🔥 IMMEDIATELY trigger toxicity analysis
    console.log(`🚀 IMMEDIATE TOXICITY ANALYSIS STARTING...`);
    
    // Run analysis IMMEDIATELY (don't use scheduler)
    try {
      const analysisResult = await ToxicityService.analyzeInteraction(interaction._id);
      
      console.log(`✅ IMMEDIATE ANALYSIS COMPLETE:`, {
        success: analysisResult?.success,
        toxicMessages: analysisResult?.analysis?.toxic_messages,
        pointsDeducted: analysisResult?.pointsDeducted
      });
      
      // Get employee AFTER analysis
      const employeeAfter = interaction.employeeId ? 
        await User.findById(interaction.employeeId) : null;
      
      console.log(`👤 Employee after: Score ${employeeAfter?.score}`);
      console.log(`💰 Score changed: ${employeeBefore?.score !== employeeAfter?.score}`);
      
      return res.json({
        success: true,
        message: "Chat completed and toxicity analysis performed",
        interactionId: interaction._id,
        customerId: interaction.customerId,
        employeeId: interaction.employeeId,
        customerName: interaction.customerName,
        status: "completed",
        toxicityAnalysis: {
          performed: true,
          success: analysisResult?.success,
          toxicMessages: analysisResult?.analysis?.toxic_messages,
          pointsDeducted: analysisResult?.pointsDeducted
        },
        employeeScore: {
          before: employeeBefore?.score,
          after: employeeAfter?.score,
          changed: employeeBefore?.score !== employeeAfter?.score
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (analysisError) {
      console.error(`❌ IMMEDIATE ANALYSIS FAILED:`, analysisError.message);
      
      // Still return success for chat completion
      return res.json({
        success: true,
        message: "Chat completed but toxicity analysis failed",
        interactionId: interaction._id,
        customerId: interaction.customerId,
        employeeId: interaction.employeeId,
        status: "completed",
        toxicityAnalysis: {
          performed: false,
          error: analysisError.message
        },
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error("❌ Error completing chat:", error);
    return res.status(500).json({
      success: false,
      message: "Error completing chat",
      error: error.message
    });
  }
});

// Debug endpoint: Force analysis
router.post("/force-analysis/:interactionId", async (req, res) => {
  try {
    const { interactionId } = req.params;
    
    console.log(`🔧 FORCE ANALYSIS FOR: ${interactionId}`);
    
    const interaction = await Interaction.findById(interactionId);
    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: "Interaction not found"
      });
    }
    
    // Get employee before
    const employeeBefore = interaction.employeeId ? 
      await User.findById(interaction.employeeId) : null;
    
    // Run analysis
    const analysisResult = await ToxicityService.analyzeInteraction(interactionId);
    
    // Get employee after
    const employeeAfter = interaction.employeeId ? 
      await User.findById(interaction.employeeId) : null;
    
    res.json({
      success: true,
      message: "Force analysis completed",
      interactionId,
      analysisResult,
      employee: {
        before: {
          score: employeeBefore?.score
        },
        after: {
          score: employeeAfter?.score
        },
        scoreChanged: employeeBefore?.score !== employeeAfter?.score
      }
    });
    
  } catch (error) {
    console.error("Force analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Force analysis failed",
      error: error.message
    });
  }
});

// GET INTERACTION BY ID
router.get("/:id", verifyUser, async (req, res) => {
  try {
    const interaction = await Interaction.findById(req.params.id);
    if (!interaction) {
      return res.status(404).json({ 
        success: false, 
        message: "Interaction not found" 
      });
    }
    res.json({ success: true, interaction });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// GET INTERACTIONS BY EMPLOYEE ID
router.get("/employee/:employeeId", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }
    
    const interactions = await Interaction.find({ employeeId }).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      interactions,
      count: interactions.length,
      employeeId 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

export default router;