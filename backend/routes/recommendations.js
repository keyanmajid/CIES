import express from "express";
import { verifyUser, optionalAuth } from "../middlewares/auth.js";
import MLService from "../service/mlService.js";

const router = express.Router();

// Get personalized recommendations for logged-in user
router.get("/personalized", verifyUser, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    console.log(`[API] Getting personalized recommendations for user: ${req.user.id}`);
    
    const recommendations = await MLService.getPersonalizedRecommendations(
      req.user.id, 
      parseInt(limit)
    );

    res.json({
      success: true,
      ...recommendations,
      user_id: req.user.id
    });
  } catch (error) {
    console.error("[RECOMMENDATION ERROR]:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get recommendations",
      recommendations: []
    });
  }
});

// Get similar products
router.get("/similar/:productId", optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 8 } = req.query;

    const similarProducts = await MLService.getSimilarProducts(
      productId, 
      parseInt(limit)
    );

    res.json({
      success: true,
      ...similarProducts
    });
  } catch (error) {
    console.error("[SIMILAR PRODUCTS ERROR]:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get similar products",
      recommendations: []
    });
  }
});

// Update the trending route to use the new method
router.get("/trending", optionalAuth, async (req, res) => {
  try {
    const { limit = 16 } = req.query;

    const trending = await MLService.getTrendingProducts(parseInt(limit));

    res.json({
      success: true,
      ...trending
    });
  } catch (error) {
    console.error("[TRENDING PRODUCTS ERROR]:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get trending products",
      recommendations: []
    });
  }
});

// Update the for-you route
router.get("/for-you", optionalAuth, async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    
    const recommendations = await MLService.getForYouRecommendations(
      req.user?.id, 
      parseInt(limit)
    );

    res.json({
      success: true,
      ...recommendations,
      user_type: req.user?.id ? 'authenticated' : 'guest'
    });
  } catch (error) {
    console.error("[FOR YOU RECOMMENDATIONS ERROR]:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get recommendations",
      recommendations: []
    });
  }
});

// ML Service health check
router.get("/health", async (req, res) => {
  try {
    const isHealthy = await MLService.healthCheck();
    res.json({
      success: true,
      ml_service_healthy: isHealthy,
      status: isHealthy ? "ML service connected" : "ML service unavailable"
    });
  } catch (error) {
    res.json({
      success: false,
      ml_service_healthy: false,
      status: "ML service check failed"
    });
  }
});

export default router;