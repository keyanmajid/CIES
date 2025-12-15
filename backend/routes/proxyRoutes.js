import express from "express";
import axios from "axios";
import { verifyUser } from "../middlewares/auth.js";

const router = express.Router();

// Proxy for ML API health check
router.get("/ml-health", verifyUser, async (req, res) => {
  try {
    console.log("🔗 Proxying ML API health check");
    
    const response = await axios.get("http://localhost:8000/health", {
      timeout: 3000
    });
    
    res.json(response.data);
  } catch (error) {
    console.error("❌ ML API proxy error:", error.message);
    res.status(502).json({
      status: "proxy_error",
      message: "Failed to connect to ML API",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Proxy for ML API analyze-chat
router.post("/analyze-chat", verifyUser, async (req, res) => {
  try {
    const chatData = req.body;
    console.log("🔗 Proxying chat analysis:", chatData.chat_id);
    
    const response = await axios.post("http://localhost:8000/analyze-chat", chatData, {
      timeout: 10000
    });
    
    res.json(response.data);
  } catch (error) {
    console.error("❌ Chat analysis proxy error:", error.message);
    
    // Fallback to mock analysis
    const toxicMessages = Math.floor(Math.random() * 5);
    const totalMessages = chatData.messages?.length || 10;
    const toxicityPercentage = (toxicMessages / totalMessages) * 100;
    
    res.json({
      success: true,
      chat_id: chatData.chat_id,
      toxic_messages: toxicMessages,
      total_messages: totalMessages,
      toxicity_percentage: toxicityPercentage,
      overall_toxicity_score: toxicityPercentage / 100,
      detailed_results: [],
      participants: chatData.participants,
      analysis_timestamp: new Date().toISOString(),
      is_fallback: true
    });
  }
});

export default router;