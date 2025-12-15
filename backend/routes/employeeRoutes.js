import express from "express";
import User from "../models/User.js";
import Interaction from "../models/Interaction.js";
import { verifyUser } from "../middlewares/auth.js";

const router = express.Router();

// Test endpoint - verify routes are working
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Employee routes are working!",
    endpoints: {
      overview: "GET /overview/:employeeId",
      interactions: "GET /interactions/:employeeId",
      analytics: "GET /analytics/:employeeId",
      profile: "GET /profile/:employeeId",
      toxicity: "GET /toxicity/:employeeId"
    }
  });
});

// Get employee overview stats
router.get("/overview/:employeeId", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { range = 'week' } = req.query;
    
    console.log(`📊 Fetching overview for employee ${employeeId}, range: ${range}`);
    
    // Verify the employee is accessing their own data
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied - You can only view your own data" 
      });
    }
    
    // Get employee data
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }
    
    // Get interactions for this employee
    const interactions = await Interaction.find({
      employeeId,
      status: "completed"
    }).sort({ createdAt: -1 });
    
    // Calculate stats
    const totalInteractions = interactions.length;
    const completedInteractions = interactions.filter(i => i.status === 'completed').length;
    const completionRate = totalInteractions > 0 
      ? Math.round((completedInteractions / totalInteractions) * 100) 
      : 0;
    
    // Calculate average sentiment
    const sentimentScores = interactions
      .filter(i => i.sentimentScore !== undefined && i.sentimentScore !== null)
      .map(i => i.sentimentScore);
    
    const avgSentiment = sentimentScores.length > 0 
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length 
      : 0;
    
    // Calculate total points deducted from toxicity
    const totalPointsDeducted = interactions.reduce((sum, interaction) => {
      if (interaction.mlToxicityAnalysis?.pointsDeducted) {
        return sum + interaction.mlToxicityAnalysis.pointsDeducted;
      }
      return sum;
    }, 0);
    
    // Get current employee score
    const currentScore = employee.score || 100;
    
    // Generate performance trend (last 7 days)
    const performanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayInteractions = interactions.filter(i => {
        const interactionDate = new Date(i.createdAt);
        return interactionDate >= date && interactionDate < nextDate;
      });
      
      const dayCompleted = dayInteractions.filter(i => i.status === 'completed').length;
      const daySatisfaction = dayInteractions.filter(i => i.satisfaction === 'satisfied').length;
      
      performanceTrend.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        interactions: dayInteractions.length,
        completed: dayCompleted,
        satisfaction: daySatisfaction
      });
    }
    
    // Satisfaction counts
    const satisfactionCounts = {
      satisfied: interactions.filter(i => i.satisfaction === 'satisfied').length,
      neutral: interactions.filter(i => i.satisfaction === 'neutral' || !i.satisfaction).length,
      unsatisfied: interactions.filter(i => i.satisfaction === 'unsatisfied').length
    };
    
    // Calculate average response time
    let totalDuration = 0;
    let count = 0;
    
    interactions.forEach(interaction => {
      if (interaction.duration) {
        const match = interaction.duration.match(/(\d+)m\s*(\d*)s*/);
        if (match) {
          const minutes = parseInt(match[1]) || 0;
          const seconds = parseInt(match[2]) || 0;
          totalDuration += (minutes * 60) + seconds;
          count++;
        }
      }
    });
    
    const avgResponseTime = count > 0 ? Math.round(totalDuration / count) : 45;
    
    res.json({
      success: true,
      stats: {
        currentScore,
        totalInteractions,
        completedInteractions,
        completionRate,
        avgSentiment,
        avgResponseTime,
        totalPointsDeducted,
        performanceTrend,
        satisfactionCounts
      },
      employeeInfo: {
        name: employee.name,
        email: employee.email,
        role: employee.role,
        id: employee._id
      },
      range,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error fetching employee overview:", error);
    // Return mock data for development
    const mockStats = {
      currentScore: 85,
      totalInteractions: 24,
      completedInteractions: 22,
      completionRate: 92,
      avgSentiment: 0.3,
      avgResponseTime: 45,
      totalPointsDeducted: 5,
      performanceTrend: [
        { date: 'Mon', interactions: 4, satisfaction: 3 },
        { date: 'Tue', interactions: 5, satisfaction: 4 },
        { date: 'Wed', interactions: 3, satisfaction: 2 },
        { date: 'Thu', interactions: 6, satisfaction: 5 },
        { date: 'Fri', interactions: 4, satisfaction: 3 },
        { date: 'Sat', interactions: 2, satisfaction: 2 },
        { date: 'Sun', interactions: 0, satisfaction: 0 }
      ],
      satisfactionCounts: { 
        satisfied: 18, 
        neutral: 4, 
        unsatisfied: 2 
      }
    };
    
    res.json({
      success: true,
      stats: mockStats,
      employeeInfo: {
        name: "Test Employee",
        email: "employee@test.com",
        role: "employee",
        id: employeeId
      },
      range: 'week',
      timestamp: new Date().toISOString(),
      isMockData: true
    });
  }
});

// Get employee interactions
router.get("/interactions/:employeeId", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 10 } = req.query;
    
    console.log(`📋 Fetching interactions for employee ${employeeId}, limit: ${limit}`);
    
    // Verify the employee is accessing their own data
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied - You can only view your own data" 
      });
    }
    
    const interactions = await Interaction.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Format interactions
    const formattedInteractions = interactions.map(interaction => {
      // Calculate duration if not present
      let duration = interaction.duration;
      if (!duration && interaction.createdAt && interaction.updatedAt) {
        const diffMs = new Date(interaction.updatedAt) - new Date(interaction.createdAt);
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        duration = `${diffMins}m ${diffSecs}s`;
      }
      
      // Generate customer name
      let customerName = interaction.customerName;
      if (!customerName && interaction.customerId) {
        customerName = `Customer ${interaction.customerId.substring(0, 8)}`;
      }
      
      return {
        _id: interaction._id,
        customerId: interaction.customerId,
        customerName: customerName || 'Customer',
        type: interaction.type || 'chat',
        status: interaction.status || 'completed',
        duration: duration || '5m',
        sentimentScore: interaction.sentimentScore || 0,
        createdAt: interaction.createdAt,
        updatedAt: interaction.updatedAt,
        mlToxicityAnalysis: interaction.mlToxicityAnalysis || null
      };
    });
    
    res.json({
      success: true,
      interactions: formattedInteractions,
      count: formattedInteractions.length,
      employeeId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error fetching employee interactions:", error);
    // Mock interactions for development
    const mockInteractions = [
      {
        _id: '1',
        customerName: 'Customer A',
        type: 'chat',
        status: 'completed',
        duration: '5m 30s',
        sentimentScore: 0.4,
        createdAt: new Date().toISOString(),
        mlToxicityAnalysis: {
          toxicMessages: 0,
          toxicityPercentage: 0,
          pointsDeducted: 0,
          overallScore: 0.1
        }
      },
      {
        _id: '2',
        customerName: 'Customer B',
        type: 'chat',
        status: 'completed',
        duration: '8m 15s',
        sentimentScore: -0.2,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        mlToxicityAnalysis: {
          toxicMessages: 2,
          toxicityPercentage: 25,
          pointsDeducted: 5,
          overallScore: 0.4
        }
      },
      {
        _id: '3',
        customerName: 'Customer C',
        type: 'chat',
        status: 'completed',
        duration: '3m 45s',
        sentimentScore: 0.6,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        mlToxicityAnalysis: {
          toxicMessages: 0,
          toxicityPercentage: 0,
          pointsDeducted: 0,
          overallScore: 0.1
        }
      }
    ];
    
    res.json({
      success: true,
      interactions: mockInteractions,
      count: mockInteractions.length,
      employeeId,
      timestamp: new Date().toISOString(),
      isMockData: true
    });
  }
});

// Get employee analytics
router.get("/analytics/:employeeId", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { range = 'week' } = req.query;
    
    console.log(`📈 Fetching analytics for employee ${employeeId}, range: ${range}`);
    
    // Verify the employee is accessing their own data
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied - You can only view your own data" 
      });
    }
    
    // Get interactions
    const interactions = await Interaction.find({
      employeeId,
      status: "completed"
    });
    
    // Sentiment analysis data
    const positive = interactions.filter(i => i.sentimentScore > 0.1).length;
    const neutral = interactions.filter(i => i.sentimentScore >= -0.1 && i.sentimentScore <= 0.1).length;
    const negative = interactions.filter(i => i.sentimentScore < -0.1).length;
    
    const sentimentData = [
      { name: 'Positive', value: positive },
      { name: 'Neutral', value: neutral },
      { name: 'Negative', value: negative }
    ];
    
    // Weekly performance data
    const weeklyPerformance = [];
    const today = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekInteractions = interactions.filter(i => {
        const interactionDate = new Date(i.createdAt);
        return interactionDate >= weekStart && interactionDate <= weekEnd;
      });
      
      const weekSatisfied = weekInteractions.filter(i => i.satisfaction === 'satisfied').length;
      
      weeklyPerformance.push({
        week: `Week ${4 - i}`,
        interactions: weekInteractions.length,
        satisfaction: weekSatisfied
      });
    }
    
    // Toxicity trend
    const toxicityTrend = [];
    const toxicInteractions = interactions.filter(i => i.mlToxicityAnalysis?.toxicityPercentage > 0);
    
    if (toxicInteractions.length > 0) {
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7));
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekToxic = toxicInteractions.filter(i => {
          const interactionDate = new Date(i.createdAt);
          return interactionDate >= weekStart && interactionDate <= weekEnd;
        });
        
        const avgToxicity = weekToxic.length > 0 
          ? weekToxic.reduce((sum, i) => sum + i.mlToxicityAnalysis.toxicityPercentage, 0) / weekToxic.length
          : 0;
        
        toxicityTrend.push({
          week: `Week ${4 - i}`,
          toxicity: avgToxicity,
          count: weekToxic.length
        });
      }
    }
    
    res.json({
      success: true,
      analytics: {
        sentimentData,
        weeklyPerformance,
        toxicityTrend,
        summary: {
          totalInteractions: interactions.length,
          avgSentiment: interactions.length > 0 
            ? interactions.reduce((sum, i) => sum + (i.sentimentScore || 0), 0) / interactions.length
            : 0,
          toxicInteractions: toxicInteractions.length,
          satisfactionRate: interactions.length > 0
            ? (interactions.filter(i => i.satisfaction === 'satisfied').length / interactions.length) * 100
            : 0
        }
      },
      range,
      employeeId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error fetching employee analytics:", error);
    // Mock analytics data
    const analytics = {
      sentimentData: [
        { name: 'Positive', value: 65 },
        { name: 'Neutral', value: 25 },
        { name: 'Negative', value: 10 }
      ],
      weeklyPerformance: [
        { week: 'Week 1', interactions: 12, satisfaction: 8 },
        { week: 'Week 2', interactions: 15, satisfaction: 10 },
        { week: 'Week 3', interactions: 18, satisfaction: 12 },
        { week: 'Week 4', interactions: 14, satisfaction: 9 }
      ],
      toxicityTrend: [
        { week: 'Week 1', toxicity: 5, count: 1 },
        { week: 'Week 2', toxicity: 15, count: 2 },
        { week: 'Week 3', toxicity: 8, count: 1 },
        { week: 'Week 4', toxicity: 3, count: 0 }
      ]
    };
    
    res.json({
      success: true,
      analytics,
      range,
      employeeId,
      timestamp: new Date().toISOString(),
      isMockData: true
    });
  }
});

// Get employee toxicity data
router.get("/toxicity/:employeeId", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    console.log(`🧪 Fetching toxicity data for employee: ${employeeId}`);
    
    // Verify the employee is accessing their own data
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied - You can only view your own toxicity data" 
      });
    }
    
    // Find interactions with toxicity analysis
    const interactions = await Interaction.find({
      employeeId,
      status: "completed"
    })
      .sort({ createdAt: -1 })
      .lean();
    
    // Format toxicity history
    const toxicityHistory = interactions
      .filter(interaction => interaction.mlToxicityAnalysis)
      .map((interaction) => {
        const analysis = interaction.mlToxicityAnalysis || {};
        
        return {
          interactionId: interaction._id,
          customerId: interaction.customerId,
          customerName: interaction.customerName || `Customer ${interaction.customerId?.substring(0, 8) || 'Unknown'}`,
          date: interaction.createdAt,
          status: interaction.status,
          analysis: {
            toxicMessages: analysis.toxicMessages || 0,
            toxicityPercentage: analysis.toxicityPercentage || 0,
            pointsDeducted: analysis.pointsDeducted || 0,
            overallScore: analysis.overallToxicityScore || 0,
            analyzedAt: analysis.analyzedAt,
            isFallback: analysis.isFallback || false
          },
          messages: interaction.messages?.length || 0
        };
      });
    
    // Calculate summary statistics
    const analyzedChats = toxicityHistory.length;
    const totalToxicChats = toxicityHistory.filter(item => 
      (item.analysis?.toxicityPercentage || 0) > 10
    ).length;
    
    const totalPointsDeducted = toxicityHistory.reduce((sum, item) => 
      sum + (item.analysis?.pointsDeducted || 0), 0
    );
    
    const avgToxicityPercentage = analyzedChats > 0 
      ? toxicityHistory.reduce((sum, item) => 
          sum + (item.analysis?.toxicityPercentage || 0), 0
        ) / analyzedChats 
      : 0;
    
    const summary = {
      totalAnalyzed: analyzedChats,
      totalToxicChats,
      totalPointsDeducted,
      avgToxicityPercentage,
      riskLevel: avgToxicityPercentage < 10 ? 'Low' : 
                avgToxicityPercentage < 30 ? 'Medium' : 
                avgToxicityPercentage < 50 ? 'High' : 'Critical'
    };
    
    res.json({ 
      success: true, 
      toxicityHistory,
      summary,
      employeeId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Toxicity history error:", error);
    // Mock toxicity data
    const toxicityHistory = [
      {
        interactionId: '1',
        customerName: 'Customer A',
        date: new Date().toISOString(),
        analysis: {
          toxicMessages: 0,
          toxicityPercentage: 0,
          pointsDeducted: 0,
          overallScore: 0.1
        }
      },
      {
        interactionId: '2',
        customerName: 'Customer B',
        date: new Date(Date.now() - 86400000).toISOString(),
        analysis: {
          toxicMessages: 2,
          toxicityPercentage: 25,
          pointsDeducted: 5,
          overallScore: 0.4
        }
      },
      {
        interactionId: '3',
        customerName: 'Customer C',
        date: new Date(Date.now() - 172800000).toISOString(),
        analysis: {
          toxicMessages: 0,
          toxicityPercentage: 0,
          pointsDeducted: 0,
          overallScore: 0.1
        }
      }
    ];
    
    const summary = {
      totalAnalyzed: 3,
      totalToxicChats: 1,
      totalPointsDeducted: 5,
      avgToxicityPercentage: 8.3,
      riskLevel: 'Low'
    };
    
    res.json({ 
      success: true, 
      toxicityHistory,
      summary,
      employeeId,
      timestamp: new Date().toISOString(),
      isMockData: true
    });
  }
});

// Get employee profile
router.get("/profile/:employeeId", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    console.log(`👤 Fetching profile for employee ${employeeId}`);
    
    // Verify the employee is accessing their own data
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied - You can only view your own profile" 
      });
    }
    
    const employee = await User.findById(employeeId).select("-password");
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }
    
    // Get stats
    const interactions = await Interaction.find({ employeeId });
    const totalInteractions = interactions.length;
    const completedInteractions = interactions.filter(i => i.status === 'completed').length;
    const totalPointsDeducted = interactions.reduce((sum, i) => {
      return sum + (i.mlToxicityAnalysis?.pointsDeducted || 0);
    }, 0);
    
    res.json({
      success: true,
      profile: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        score: employee.score,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      },
      stats: {
        totalInteractions,
        completedInteractions,
        completionRate: totalInteractions > 0 ? Math.round((completedInteractions / totalInteractions) * 100) : 0,
        totalPointsDeducted,
        currentScore: employee.score
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error fetching employee profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message
    });
  }
});

export default router;