// routes/satisfactionRoutes.js
import express from "express";
import Interaction from "../models/Interaction.js";
import User from "../models/User.js";
import { verifyUser, verifyRole } from "../middlewares/auth.js";

const router = express.Router();

// ML API URL for satisfaction prediction
const ML_SATISFACTION_API = "https://keyanmajid-space-ml.hf.space";

// ✅ GET CUSTOMER SATISFACTION DASHBOARD FOR EMPLOYEE
router.get("/employee/:employeeId/dashboard", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { range = 'month' } = req.query;
    
    // Verify access
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    switch (range) {
      case 'week':
        dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) } };
        break;
      case 'month':
        dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 1)) } };
        break;
      case 'quarter':
        dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 3)) } };
        break;
      case 'year':
        dateFilter = { createdAt: { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) } };
        break;
    }
    
    // Get all interactions for this employee
    const interactions = await Interaction.find({
      employeeId,
      status: 'completed',
      ...dateFilter
    }).sort({ createdAt: -1 });
    
    // Calculate satisfaction statistics
    const totalInteractions = interactions.length;
    
    // Filter interactions with satisfaction analysis
    const analyzedInteractions = interactions.filter(i => 
      i.customerSatisfaction?.predictedLabel || i.customerFeedback?.rating
    );
    
    const mlAnalyzed = interactions.filter(i => 
      i.customerSatisfaction?.predictedLabel && i.customerSatisfaction.analyzedAt
    ).length;
    
    // Satisfaction breakdown
    const satisfactionBreakdown = {
      satisfied: {
        count: interactions.filter(i => 
          i.customerSatisfaction?.predictedLabel === 'satisfied' || 
          i.customerFeedback?.rating >= 4
        ).length,
        percentage: 0
      },
      neutral: {
        count: interactions.filter(i => 
          i.customerSatisfaction?.predictedLabel === 'neutral' || 
          i.customerFeedback?.rating === 3
        ).length,
        percentage: 0
      },
      dissatisfied: {
        count: interactions.filter(i => 
          i.customerSatisfaction?.predictedLabel === 'dissatisfied' || 
          i.customerFeedback?.rating <= 2
        ).length,
        percentage: 0
      },
      notAnalyzed: {
        count: totalInteractions - analyzedInteractions.length,
        percentage: 0
      }
    };
    
    // Calculate percentages
    Object.keys(satisfactionBreakdown).forEach(key => {
      satisfactionBreakdown[key].percentage = totalInteractions > 0 
        ? Math.round((satisfactionBreakdown[key].count / totalInteractions) * 100) 
        : 0;
    });
    
    // Average satisfaction score
    const scores = analyzedInteractions
      .filter(i => i.customerSatisfaction?.satisfactionScore)
      .map(i => i.customerSatisfaction.satisfactionScore);
    
    const avgSatisfactionScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
      : null;
    
    // Get recent satisfaction analysis
    const recentSatisfaction = interactions
      .filter(i => i.customerSatisfaction?.predictedLabel)
      .slice(0, 10)
      .map(interaction => ({
        interactionId: interaction._id,
        customerName: interaction.customerName || `Customer ${interaction.customerId?.substring(0, 8)}`,
        date: interaction.createdAt,
        type: interaction.type,
        satisfaction: {
          label: interaction.customerSatisfaction.predictedLabel,
          score: interaction.customerSatisfaction.satisfactionScore,
          confidence: interaction.customerSatisfaction.confidence,
          analyzedAt: interaction.customerSatisfaction.analyzedAt
        },
        feedback: interaction.customerFeedback || null,
        sentimentScore: interaction.sentimentScore
      }));
    
    // Satisfaction trend over time (last 7 days)
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayInteractions = interactions.filter(i => 
        i.createdAt >= date && i.createdAt < nextDate
      );
      
      const satisfiedCount = dayInteractions.filter(i => 
        i.customerSatisfaction?.predictedLabel === 'satisfied' || 
        i.customerFeedback?.rating >= 4
      ).length;
      
      const analyzedCount = dayInteractions.filter(i => 
        i.customerSatisfaction?.predictedLabel
      ).length;
      
      trendData.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        total: dayInteractions.length,
        satisfied: satisfiedCount,
        satisfactionRate: dayInteractions.length > 0 
          ? Math.round((satisfiedCount / dayInteractions.length) * 100) 
          : 0,
        analyzed: analyzedCount
      });
    }
    
    // Customer feedback summary
    const feedbacks = interactions.filter(i => i.customerFeedback?.comment);
    const feedbackSummary = {
      total: feedbacks.length,
      averageRating: feedbacks.length > 0 
        ? Math.round(feedbacks.reduce((sum, i) => sum + (i.customerFeedback.rating || 0), 0) / feedbacks.length * 10) / 10 
        : null,
      latestComments: feedbacks
        .slice(0, 5)
        .map(f => ({
          rating: f.customerFeedback.rating,
          comment: f.customerFeedback.comment,
          date: f.customerFeedback.submittedAt
        }))
    };
    
    // Dashboard data
    const dashboardData = {
      summary: {
        totalInteractions,
        analyzedInteractions: analyzedInteractions.length,
        mlAnalyzed,
        avgSatisfactionScore,
        satisfactionRate: totalInteractions > 0 
          ? Math.round((satisfactionBreakdown.satisfied.count / totalInteractions) * 100) 
          : 0,
        needsFollowup: interactions.filter(i => i.needsFollowup).length
      },
      breakdown: satisfactionBreakdown,
      trend: trendData,
      recentAnalysis: recentSatisfaction,
      feedback: feedbackSummary,
      mlApiStatus: await checkMLAPIStatus()
    };
    
    res.json({
      success: true,
      dashboard: dashboardData,
      employeeId,
      timeRange: range
    });
    
  } catch (err) {
    console.error("Satisfaction dashboard error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// ✅ GET SPECIFIC INTERACTION SATISFACTION ANALYSIS
router.get("/interaction/:interactionId", verifyUser, async (req, res) => {
  try {
    const { interactionId } = req.params;
    
    const interaction = await Interaction.findById(interactionId);
    
    if (!interaction) {
      return res.status(404).json({ success: false, message: "Interaction not found" });
    }
    
    // Verify access (employee can only see their own interactions)
    if (req.user.role === 'employee' && req.user.id !== interaction.employeeId.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    // Check if we need to analyze this interaction
    let shouldAnalyze = false;
    let analysisResult = null;
    
    if (!interaction.customerSatisfaction?.predictedLabel && 
        interaction.status === 'completed' &&
        interaction.messages && interaction.messages.length > 0) {
      
      // Check if it's been more than 1 hour since completion without analysis
      const completedTime = new Date(interaction.completedAt || interaction.updatedAt);
      const now = new Date();
      const hoursDiff = (now - completedTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 1) {
        shouldAnalyze = true;
        analysisResult = await analyzeCustomerSatisfaction(interaction);
      }
    }
    
    // Format response
    const response = {
      success: true,
      interaction: {
        _id: interaction._id,
        customerId: interaction.customerId,
        customerName: interaction.customerName,
        type: interaction.type,
        status: interaction.status,
        createdAt: interaction.createdAt,
        completedAt: interaction.completedAt,
        messages: interaction.messages?.length || 0,
        sentimentScore: interaction.sentimentScore
      },
      satisfaction: interaction.customerSatisfaction || {},
      feedback: interaction.customerFeedback || {},
      analysisHistory: interaction.satisfactionAnalysisHistory || [],
      mlApiStatus: await checkMLAPIStatus(),
      shouldAnalyze,
      analysisResult
    };
    
    res.json(response);
    
  } catch (err) {
    console.error("Interaction satisfaction error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// ✅ ANALYZE CUSTOMER SATISFACTION FOR SPECIFIC INTERACTION
router.post("/interaction/:interactionId/analyze", verifyUser, async (req, res) => {
  try {
    const { interactionId } = req.params;
    const { force = false } = req.body;
    
    const interaction = await Interaction.findById(interactionId);
    
    if (!interaction) {
      return res.status(404).json({ success: false, message: "Interaction not found" });
    }
    
    // Verify access
    if (req.user.role === 'employee' && req.user.id !== interaction.employeeId.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    // Check if already analyzed recently (unless forced)
    if (!force && interaction.customerSatisfaction?.analyzedAt) {
      const lastAnalysis = new Date(interaction.customerSatisfaction.analyzedAt);
      const now = new Date();
      const hoursDiff = (now - lastAnalysis) / (1000 * 60 * 60);
      
      if (hoursDiff < 1) { // Don't analyze if analyzed in last hour
        return res.json({
          success: true,
          message: "Already analyzed recently",
          satisfaction: interaction.customerSatisfaction
        });
      }
    }
    
    // Analyze satisfaction
    const analysis = await analyzeCustomerSatisfaction(interaction);
    
    if (analysis.success) {
      // Update interaction with analysis results
      const updateData = {
        'customerSatisfaction.predictedLabel': analysis.prediction,
        'customerSatisfaction.confidence': analysis.confidence,
        'customerSatisfaction.satisfactionScore': analysis.satisfactionScore,
        'customerSatisfaction.analyzedAt': new Date(),
        'customerSatisfaction.mlModelVersion': analysis.modelVersion,
        'isCustomerSatisfied': analysis.prediction === 'satisfied',
        'needsFollowup': analysis.prediction === 'dissatisfied'
      };
      
      // Add to history
      const historyEntry = {
        timestamp: new Date(),
        predictedLabel: analysis.prediction,
        confidence: analysis.confidence,
        satisfactionScore: analysis.satisfactionScore,
        modelVersion: analysis.modelVersion,
        source: 'ml'
      };
      
      await Interaction.findByIdAndUpdate(
        interactionId,
        { 
          $set: updateData,
          $push: { 
            satisfactionAnalysisHistory: {
              $each: [historyEntry],
              $slice: -10 // Keep last 10 entries
            }
          }
        },
        { new: true }
      );
      
      res.json({
        success: true,
        message: "Satisfaction analysis completed",
        analysis,
        updated: updateData
      });
      
    } else {
      res.status(500).json({
        success: false,
        message: "Analysis failed",
        error: analysis.error
      });
    }
    
  } catch (err) {
    console.error("Satisfaction analysis error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// ✅ SUBMIT MANUAL CUSTOMER FEEDBACK
router.post("/interaction/:interactionId/feedback", verifyUser, async (req, res) => {
  try {
    const { interactionId } = req.params;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: "Rating must be between 1 and 5" 
      });
    }
    
    const interaction = await Interaction.findById(interactionId);
    
    if (!interaction) {
      return res.status(404).json({ success: false, message: "Interaction not found" });
    }
    
    // Verify access
    if (req.user.role === 'employee' && req.user.id !== interaction.employeeId.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    // Update feedback
    const feedbackData = {
      rating: parseInt(rating),
      comment: comment || null,
      submittedAt: new Date()
    };
    
    // Determine satisfaction label based on rating
    let satisfactionLabel = 'neutral';
    if (rating >= 4) satisfactionLabel = 'satisfied';
    if (rating <= 2) satisfactionLabel = 'dissatisfied';
    
    // Add to history
    const historyEntry = {
      timestamp: new Date(),
      predictedLabel: satisfactionLabel,
      confidence: 1.0, // Manual feedback has 100% confidence
      satisfactionScore: rating * 20, // Convert 1-5 to 0-100
      modelVersion: 'manual_feedback',
      source: 'manual'
    };
    
    await Interaction.findByIdAndUpdate(
      interactionId,
      { 
        $set: {
          'customerFeedback': feedbackData,
          'customerSatisfaction.predictedLabel': satisfactionLabel,
          'customerSatisfaction.confidence': 1.0,
          'customerSatisfaction.satisfactionScore': rating * 20,
          'customerSatisfaction.analyzedAt': new Date(),
          'customerSatisfaction.mlModelVersion': 'manual',
          'isCustomerSatisfied': rating >= 4,
          'needsFollowup': rating <= 2
        },
        $push: { 
          satisfactionAnalysisHistory: {
            $each: [historyEntry],
            $slice: -10
          }
        }
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: feedbackData,
      satisfactionLabel
    });
    
  } catch (err) {
    console.error("Feedback submission error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// ✅ GET UNSATISFIED CUSTOMERS (NEEDS FOLLOWUP)
router.get("/employee/:employeeId/unsatisfied", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    // Verify access
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    const skip = (page - 1) * limit;
    
    const interactions = await Interaction.find({
      employeeId,
      $or: [
        { 'customerSatisfaction.predictedLabel': 'dissatisfied' },
        { 'customerFeedback.rating': { $lte: 2 } },
        { needsFollowup: true }
      ],
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Interaction.countDocuments({
      employeeId,
      $or: [
        { 'customerSatisfaction.predictedLabel': 'dissatisfied' },
        { 'customerFeedback.rating': { $lte: 2 } },
        { needsFollowup: true }
      ],
      status: 'completed'
    });
    
    const formattedInteractions = interactions.map(interaction => ({
      _id: interaction._id,
      customerId: interaction.customerId,
      customerName: interaction.customerName || `Customer ${interaction.customerId?.substring(0, 8)}`,
      date: interaction.createdAt,
      type: interaction.type,
      reason: interaction.customerSatisfaction?.predictedLabel === 'dissatisfied' 
        ? 'ML Analysis: Dissatisfied' 
        : interaction.customerFeedback?.rating <= 2 
          ? `Low Rating: ${interaction.customerFeedback.rating}/5` 
          : 'Flagged for Followup',
      sentimentScore: interaction.sentimentScore,
      satisfaction: {
        label: interaction.customerSatisfaction?.predictedLabel,
        score: interaction.customerSatisfaction?.satisfactionScore,
        confidence: interaction.customerSatisfaction?.confidence
      },
      feedback: interaction.customerFeedback || null,
      messages: interaction.messages?.length || 0
    }));
    
    res.json({
      success: true,
      interactions: formattedInteractions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalInteractions: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
    
  } catch (err) {
    console.error("Unsatisfied customers error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// ✅ BATCH ANALYZE UNANALYZED INTERACTIONS
router.post("/employee/:employeeId/batch-analyze", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 10 } = req.body;
    
    // Verify access
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    // Find interactions without satisfaction analysis
    const unanalyzedInteractions = await Interaction.find({
      employeeId,
      status: 'completed',
      $or: [
        { 'customerSatisfaction.predictedLabel': { $exists: false } },
        { 'customerSatisfaction.predictedLabel': null },
        { 'customerSatisfaction.analyzedAt': { $exists: false } }
      ],
      messages: { $exists: true, $not: { $size: 0 } }
    })
      .limit(parseInt(limit))
      .sort({ completedAt: -1 });
    
    if (unanalyzedInteractions.length === 0) {
      return res.json({
        success: true,
        message: "No unanalyzed interactions found",
        analyzed: 0,
        results: []
      });
    }
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    // Analyze each interaction
    for (const interaction of unanalyzedInteractions) {
      try {
        const analysis = await analyzeCustomerSatisfaction(interaction);
        
        if (analysis.success) {
          // Update interaction
          const updateData = {
            'customerSatisfaction.predictedLabel': analysis.prediction,
            'customerSatisfaction.confidence': analysis.confidence,
            'customerSatisfaction.satisfactionScore': analysis.satisfactionScore,
            'customerSatisfaction.analyzedAt': new Date(),
            'customerSatisfaction.mlModelVersion': analysis.modelVersion,
            'isCustomerSatisfied': analysis.prediction === 'satisfied',
            'needsFollowup': analysis.prediction === 'dissatisfied'
          };
          
          await Interaction.findByIdAndUpdate(
            interaction._id,
            { $set: updateData },
            { new: true }
          );
          
          successCount++;
          results.push({
            interactionId: interaction._id,
            customer: interaction.customerName,
            success: true,
            prediction: analysis.prediction,
            confidence: analysis.confidence
          });
        } else {
          failCount++;
          results.push({
            interactionId: interaction._id,
            customer: interaction.customerName,
            success: false,
            error: analysis.error
          });
        }
      } catch (err) {
        failCount++;
        results.push({
          interactionId: interaction._id,
          customer: interaction.customerName,
          success: false,
          error: err.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Batch analysis completed: ${successCount} successful, ${failCount} failed`,
      total: unanalyzedInteractions.length,
      analyzed: successCount,
      failed: failCount,
      results
    });
    
  } catch (err) {
    console.error("Batch analysis error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

// ✅ HELPER FUNCTIONS

// Check ML API status
async function checkMLAPIStatus() {
  try {
    const response = await fetch(`${ML_SATISFACTION_API}/health`, {
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        status: 'connected',
        model_loaded: data.model_loaded,
        accuracy: data.accuracy,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    // ignore timeout errors
  }
  
  return {
    status: 'disconnected',
    model_loaded: false,
    accuracy: 0,
    timestamp: new Date().toISOString()
  };
}

// Analyze customer satisfaction using ML API
async function analyzeCustomerSatisfaction(interaction) {
  try {
    // Combine all customer messages into text
    const customerMessages = interaction.messages
      ?.filter(m => m.sender === 'customer')
      ?.map(m => m.text)
      ?.join('. ') || '';
    
    if (!customerMessages || customerMessages.trim().length < 10) {
      return {
        success: false,
        error: "Not enough customer messages to analyze"
      };
    }
    
    // Prepare request to ML API
    const requestBody = {
      text: customerMessages,
      customer_id: interaction.customerId,
      conversation_id: interaction._id.toString(),
      agent_id: interaction.employeeId.toString(),
      metadata: {
        interaction_type: interaction.type,
        message_count: interaction.messages?.length || 0,
        sentiment_score: interaction.sentimentScore || null
      }
    };
    
    const response = await fetch(`${ML_SATISFACTION_API}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      timeout: 10000 // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`ML API returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || "ML analysis failed");
    }
    
    // Map ML result to our satisfaction labels
    let prediction = 'neutral';
    if (result.is_satisfied) {
      prediction = 'satisfied';
    } else if (result.confidence > 0.7 && !result.is_satisfied) {
      prediction = 'dissatisfied';
    }
    
    return {
      success: true,
      prediction,
      confidence: result.confidence,
      satisfactionScore: result.satisfaction_score,
      modelVersion: result.model_info?.version || '1.0',
      rawResult: result
    };
    
  } catch (error) {
    console.error("ML analysis error:", error);
    
    // Fallback: Use sentiment score as proxy for satisfaction
    if (interaction.sentimentScore !== null) {
      let prediction = 'neutral';
      let confidence = 0.6;
      let satisfactionScore = 50;
      
      if (interaction.sentimentScore > 0.3) {
        prediction = 'satisfied';
        confidence = 0.7;
        satisfactionScore = Math.min(100, Math.round((interaction.sentimentScore + 1) * 50));
      } else if (interaction.sentimentScore < -0.3) {
        prediction = 'dissatisfied';
        confidence = 0.7;
        satisfactionScore = Math.max(0, Math.round((interaction.sentimentScore + 1) * 50));
      } else {
        satisfactionScore = Math.round((interaction.sentimentScore + 1) * 50);
      }
      
      return {
        success: true,
        prediction,
        confidence,
        satisfactionScore,
        modelVersion: 'sentiment_fallback',
        fallback: true
      };
    }
    
    return {
      success: false,
      error: error.message || "Failed to analyze satisfaction"
    };
  }
}

export default router;