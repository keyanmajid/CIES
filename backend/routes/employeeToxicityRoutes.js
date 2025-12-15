// backend/routes/employeeToxicityRoutes.js

import express from "express";
import Interaction from "../models/Interaction.js";
import User from "../models/User.js";
import { verifyUser, verifyRole } from "../middlewares/auth.js";

const router = express.Router();

// Get employee toxicity report - FIXED ROUTE PATTERN
router.get("/:employeeId/report", verifyUser, verifyRole(["employee", "manager"]), async (req, res) => {
  try {
    // Get toxicity service from app context
    const toxicityService = req.app.get('toxicityService');
    
    if (!toxicityService) {
      return res.status(500).json({ 
        success: false, 
        message: "Toxicity service not available" 
      });
    }
    
    const { employeeId } = req.params;
    const { days = 30 } = req.query;
    
    console.log(`📊 Fetching toxicity report for employee: ${employeeId}, days: ${days}`);
    
    const report = await toxicityService.getEmployeeToxicityReport(employeeId, parseInt(days));
    
    if (!report) {
      return res.json({ 
        success: true, 
        report: {
          employeeId,
          period: `${days} days`,
          totalInteractions: 0,
          toxicInteractions: 0,
          totalPointsDeducted: 0,
          averageToxicityScore: 0,
          interactions: []
        }
      });
    }
    
    res.json({ success: true, report });
  } catch (error) {
    console.error("Error fetching toxicity report:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get toxic interactions for monitoring
router.get("/toxic-interactions", verifyUser, verifyRole(["manager"]), async (req, res) => {
  try {
    const { page = 1, limit = 20, employeeId } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {
      'toxicityAnalysis.analyzedAt': { $exists: true },
      'toxicityAnalysis.employeeToxicityScore': { $gt: 0.5 }
    };
    
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    const interactions = await Interaction.find(query)
      .sort({ 'toxicityAnalysis.analyzedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('employeeId', 'name email score')
      .lean();
    
    const total = await Interaction.countDocuments(query);
    
    // Add employee info
    const enhancedInteractions = await Promise.all(
      interactions.map(async (interaction) => {
        let employeeName = 'Unknown';
        let employeeScore = 0;
        
        if (interaction.employeeId) {
          const employee = await User.findById(interaction.employeeId);
          if (employee) {
            employeeName = employee.name;
            employeeScore = employee.score;
          }
        }
        
        return {
          ...interaction,
          employeeName,
          employeeScore
        };
      })
    );
    
    res.json({
      success: true,
      interactions: enhancedInteractions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching toxic interactions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get leaderboard (employees with least toxicity)
router.get("/leaderboard", verifyUser, verifyRole(["manager"]), async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('name email score')
      .sort({ score: -1 })
      .limit(10)
      .lean();
    
    // Get toxicity stats for each employee
    const toxicityService = req.app.get('toxicityService');
    const leaderboard = await Promise.all(
      employees.map(async (employee) => {
        let toxicInteractions = 0;
        let totalPointsDeducted = 0;
        let avgToxicityScore = 0;
        
        if (toxicityService) {
          const report = await toxicityService.getEmployeeToxicityReport(employee._id, 30);
          if (report) {
            toxicInteractions = report.toxicInteractions || 0;
            totalPointsDeducted = report.totalPointsDeducted || 0;
            avgToxicityScore = report.averageToxicityScore || 0;
          }
        }
        
        return {
          name: employee.name,
          email: employee.email,
          score: employee.score,
          toxicInteractions,
          totalPointsDeducted,
          avgToxicityScore: avgToxicityScore.toFixed(3)
        };
      })
    );
    
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Error generating leaderboard:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Manually trigger toxicity analysis for an interaction
router.post("/analyze/:interactionId", verifyUser, verifyRole(["manager"]), async (req, res) => {
  try {
    const { interactionId } = req.params;
    
    // Get toxicity service from app context
    const toxicityService = req.app.get('toxicityService');
    
    if (!toxicityService) {
      return res.status(500).json({ 
        success: false, 
        message: "Toxicity service not available" 
      });
    }
    
    const result = await toxicityService.processCompletedInteraction(interactionId);
    
    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: "Interaction not found or analysis failed" 
      });
    }
    
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error manually analyzing interaction:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;