import express from "express";
import Interaction from "../models/Interaction.js";
import User from "../models/User.js";
import { verifyUser, verifyRole } from "../middlewares/auth.js";

const router = express.Router();

// GET EMPLOYEE DASHBOARD OVERVIEW STATS
router.get("/overview/:employeeId", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { range = 'week' } = req.query;
    
    // Verify the employee is accessing their own data (or manager/admin)
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    let dateFilter = {};
    const now = new Date();
    
    switch (range) {
      case 'week':
        dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) } };
        break;
      case 'month':
        dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 1)) } };
        break;
      case 'year':
        dateFilter = { createdAt: { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) } };
        break;
    }
    
    const interactions = await Interaction.find({
      employeeId,
      ...dateFilter
    });

    // Calculate stats
    const totalInteractions = interactions.length;
    const completedInteractions = interactions.filter(i => i.status === 'completed').length;
    
    const sentimentScores = interactions.filter(i => i.sentimentScore !== null).map(i => i.sentimentScore);
    const avgSentiment = sentimentScores.length > 0 ? 
      sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length : 0;
    
    const totalPointsDeducted = interactions.reduce((acc, i) => acc + (i.pointsDeducted || 0), 0);
    
    // Calculate average response time (simplified - you might want more complex logic)
    let totalResponseTime = 0;
    let responseCount = 0;
    
    interactions.forEach(interaction => {
      if (interaction.messages && interaction.messages.length > 1) {
        const employeeMessages = interaction.messages.filter(m => m.sender === 'employee');
        if (employeeMessages.length > 0) {
          // Simple calculation - you might want more sophisticated timing logic
          totalResponseTime += 45; // Placeholder
          responseCount++;
        }
      }
    });
    
    const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;

    // Satisfaction distribution
    const satisfactionCounts = {
      satisfied: interactions.filter(i => i.satisfaction === 'satisfied').length,
      neutral: interactions.filter(i => i.satisfaction === 'neutral').length,
      unsatisfied: interactions.filter(i => i.satisfaction === 'unsatisfied').length,
      pending: interactions.filter(i => !i.satisfaction).length
    };

    // Recent performance trend (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayInteractions = interactions.filter(i => 
        i.createdAt >= date && i.createdAt < nextDate
      );
      
      const daySentiment = dayInteractions.filter(i => i.sentimentScore !== null)
        .reduce((acc, i) => acc + i.sentimentScore, 0) / dayInteractions.length || 0;
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        interactions: dayInteractions.length,
        avgSentiment: parseFloat(daySentiment.toFixed(2)),
        satisfaction: dayInteractions.filter(i => i.satisfaction === 'satisfied').length
      });
    }

    const stats = {
      totalInteractions,
      completedInteractions,
      completionRate: totalInteractions > 0 ? (completedInteractions / totalInteractions * 100).toFixed(1) : 0,
      avgSentiment: parseFloat(avgSentiment.toFixed(2)),
      avgResponseTime,
      totalPointsDeducted,
      satisfactionCounts,
      performanceTrend: last7Days,
      currentScore: (await User.findById(employeeId))?.score || 100
    };
    
    res.json({ 
      success: true, 
      stats,
      timeRange: range
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// GET EMPLOYEE RECENT INTERACTIONS
// In your dashboard routes, update the interactions endpoint:
// GET EMPLOYEE RECENT INTERACTIONS
// GET EMPLOYEE RECENT INTERACTIONS - FIXED VERSION
router.get("/interactions/:employeeId", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Verify access
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    const skip = (page - 1) * limit;
    
    const interactions = await Interaction.find({ employeeId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // FIXED: Use the stored customerName directly
    const formattedInteractions = interactions.map((interaction) => {
      // Use the stored customerName if it exists and is not generic
      let customerDisplayName = interaction.customerName;
      
      console.log("🔍 Interaction data:", {
        id: interaction._id,
        storedCustomerName: interaction.customerName,
        customerId: interaction.customerId,
        finalDisplayName: customerDisplayName
      });
      
      // Only fallback to customerId if customerName is generic
      if (!customerDisplayName || 
          customerDisplayName === 'Guest' || 
          customerDisplayName === 'Customer' ||
          customerDisplayName.startsWith('Customer ')) {
        
        if (interaction.customerId && interaction.customerId.startsWith('cust-')) {
          customerDisplayName = `Customer ${interaction.customerId.substring(5, 10)}`;
        } else if (interaction.customerId) {
          customerDisplayName = `Customer ${interaction.customerId.substring(0, 6)}`;
        } else {
          customerDisplayName = 'Customer';
        }
      }
      
      return {
        _id: interaction._id,
        customerId: interaction.customerId,
        customerName: customerDisplayName, // This should now show "ariz majid"
        type: interaction.type,
        status: interaction.status,
        createdAt: interaction.createdAt,
        duration: interaction.messages ? `${interaction.messages.length} messages` : '0 messages',
        sentimentScore: interaction.sentimentScore,
        satisfaction: interaction.satisfaction,
        pointsDeducted: interaction.pointsDeducted || 0,
        features: interaction.features || {}
      };
    });
    
    const total = await Interaction.countDocuments({ employeeId });
    
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
    console.error("Interactions fetch error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// GET EMPLOYEE PERFORMANCE ANALYTICS
router.get("/analytics/:employeeId", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { range = 'month' } = req.query;
    
    // Verify access
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
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
    
    const interactions = await Interaction.find({
      employeeId,
      ...dateFilter
    });

    // Sentiment analysis data
    const sentimentData = [
      { name: 'Positive', value: interactions.filter(i => i.sentimentScore > 0.1).length },
      { name: 'Neutral', value: interactions.filter(i => i.sentimentScore >= -0.1 && i.sentimentScore <= 0.1).length },
      { name: 'Negative', value: interactions.filter(i => i.sentimentScore < -0.1).length }
    ].filter(item => item.value > 0);

    // Weekly performance data
    const weeklyData = [];
    const weeks = range === 'week' ? 1 : range === 'month' ? 4 : range === 'quarter' ? 12 : 52;
    
    for (let i = weeks - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (i + 1) * 7);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      
      const weekInteractions = interactions.filter(i => 
        i.createdAt >= startDate && i.createdAt < endDate
      );
      
      const weekSentiment = weekInteractions.filter(i => i.sentimentScore !== null)
        .reduce((acc, i) => acc + i.sentimentScore, 0) / weekInteractions.length || 0;
      
      weeklyData.push({
        week: `Week ${weeks - i}`,
        interactions: weekInteractions.length,
        avgSentiment: parseFloat(weekSentiment.toFixed(2)),
        satisfaction: weekInteractions.filter(i => i.satisfaction === 'satisfied').length,
        responseTime: 45 // Placeholder - calculate based on your timing logic
      });
    }

    // Interaction type distribution
    const typeDistribution = [
      { name: 'Chat', value: interactions.filter(i => i.type === 'chat').length },
      { name: 'Call', value: interactions.filter(i => i.type === 'call').length }
    ].filter(item => item.value > 0);

    const analytics = {
      sentimentData,
      weeklyPerformance: weeklyData,
      typeDistribution,
      totalAnalytics: {
        totalHours: Math.round(interactions.length * 0.5), // Placeholder calculation
        avgSessionLength: '15m', // Placeholder
        peakHours: '2 PM - 4 PM', // Placeholder
        busiestDay: 'Wednesday' // Placeholder
      }
    };
    
    res.json({ 
      success: true, 
      analytics,
      timeRange: range
    });
  } catch (err) {
    console.error("Analytics fetch error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// GET EMPLOYEE PROFILE
router.get("/profile/:employeeId", verifyUser, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Verify access
    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    const employee = await User.findById(employeeId).select('-password');
    
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    
    // Get some additional stats for profile
    const totalInteractions = await Interaction.countDocuments({ employeeId });
    const recentInteractions = await Interaction.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    const profileData = {
      employee,
      stats: {
        totalInteractions,
        joinDate: employee.createdAt,
        lastActive: recentInteractions[0]?.createdAt || employee.updatedAt
      },
      recentActivity: recentInteractions.map(i => ({
        id: i._id,
        customer: i.customerName,
        type: i.type,
        date: i.createdAt,
        status: i.status
      }))
    };
    
    res.json({ 
      success: true, 
      profile: profileData
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

export default router;