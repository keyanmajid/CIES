// backend/routes/toxicityRoutes.js
import express from "express";
import ToxicityService from "../service/toxicityService.js";
import ToxicityScheduler from "../schedulers/toxicityScheduler.js";
import Interaction from "../models/Interaction.js";
import { verifyUser, verifyRole } from "../middlewares/auth.js";

const router = express.Router();

/**
 * @route   GET /api/toxicity/health
 * @desc    Check ML API health
 * @access  Manager, Admin
 */
router.get("/health", verifyUser, verifyRole(["manager", "admin"]), async (req, res) => {
  try {
    const health = await ToxicityService.checkHealth();
    res.json({
      success: true,
      mlApi: health,
      scheduler: ToxicityScheduler.getStatus(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking health",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/toxicity/analyze/:interactionId
 * @desc    Manually trigger toxicity analysis
 * @access  Manager, Admin
 */
router.post("/analyze/:interactionId", verifyUser, verifyRole(["manager", "admin"]), async (req, res) => {
  try {
    const { interactionId } = req.params;
    
    console.log(`🔧 Manual analysis requested for: ${interactionId}`);
    
    const result = await ToxicityScheduler.manuallyAnalyze(interactionId);
    
    res.json({
      success: true,
      message: "Toxicity analysis initiated",
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to analyze toxicity",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/toxicity/results/:interactionId
 * @desc    Get toxicity analysis results
 * @access  Manager, Admin, Employee (own chats)
 */
router.get("/results/:interactionId", verifyUser, async (req, res) => {
  try {
    const { interactionId } = req.params;
    
    // Get the interaction
    const interaction = await Interaction.findById(interactionId);
    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: "Interaction not found"
      });
    }

    // Check permissions
    const isOwner = interaction.employeeId.toString() === req.user.id;
    const isManager = req.user.role === "manager" || req.user.role === "admin";
    
    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this analysis"
      });
    }

    const results = await ToxicityService.getAnalysisResults(interactionId);
    
    res.json({
      success: true,
      interactionId,
      ...results,
      permission: {
        isOwner,
        isManager
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching analysis results",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/toxicity/scheduler/status
 * @desc    Get scheduler status
 * @access  Manager, Admin
 */
router.get("/scheduler/status", verifyUser, verifyRole(["manager", "admin"]), async (req, res) => {
  try {
    const status = ToxicityScheduler.getStatus();
    
    res.json({
      success: true,
      scheduler: status,
      mlHealth: await ToxicityService.checkHealth(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting scheduler status",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/toxicity/scheduler/start
 * @desc    Start the toxicity analysis scheduler
 * @access  Manager, Admin
 */
router.post("/scheduler/start", verifyUser, verifyRole(["manager", "admin"]), async (req, res) => {
  try {
    ToxicityScheduler.start();
    
    res.json({
      success: true,
      message: "Toxicity analysis scheduler started",
      status: ToxicityScheduler.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error starting scheduler",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/toxicity/scheduler/stop
 * @desc    Stop the toxicity analysis scheduler
 * @access  Manager, Admin
 */
router.post("/scheduler/stop", verifyUser, verifyRole(["manager", "admin"]), async (req, res) => {
  try {
    ToxicityScheduler.stop();
    
    res.json({
      success: true,
      message: "Toxicity analysis scheduler stopped",
      status: ToxicityScheduler.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error stopping scheduler",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/toxicity/employee/:employeeId
 * @desc    Get toxicity summary for an employee
 * @access  Manager, Admin
 */
router.get("/employee/:employeeId", verifyUser, verifyRole(["manager", "admin"]), async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Get all analyzed interactions for this employee
    const interactions = await Interaction.find({
      employeeId,
      mlAnalysis: { $exists: true }
    }).select('mlAnalysis pointsDeducted createdAt');
    
    const summary = {
      employeeId,
      totalAnalyzed: interactions.length,
      totalToxicChats: 0,
      totalPointsDeducted: 0,
      avgToxicityPercentage: 0,
      toxicChats: []
    };
    
    let totalToxicity = 0;
    
    interactions.forEach(interaction => {
      const analysis = interaction.mlAnalysis;
      
      if (analysis.toxicityPercentage > 10) { // Consider >10% as toxic chat
        summary.totalToxicChats++;
        summary.toxicChats.push({
          interactionId: interaction._id,
          date: interaction.createdAt,
          toxicityPercentage: analysis.toxicityPercentage,
          pointsDeducted: analysis.pointsDeducted || 0,
          toxicMessages: analysis.toxicMessages || 0
        });
      }
      
      totalToxicity += analysis.toxicityPercentage || 0;
      summary.totalPointsDeducted += analysis.pointsDeducted || 0;
    });
    
    summary.avgToxicityPercentage = interactions.length > 0 
      ? totalToxicity / interactions.length 
      : 0;
    
    // Get employee current score
    const User = (await import('../models/User.js')).default;
    const employee = await User.findById(employeeId).select('name score status');
    
    res.json({
      success: true,
      employee: employee || { id: employeeId },
      toxicitySummary: summary,
      interactionsAnalyzed: interactions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting employee toxicity summary",
      error: error.message
    });
  }
});

export default router;