import axios from 'axios';

const ML_API_URL = 'https://huggingface.co/spaces/keyanmajid/recomendationml'; // Your FastAPI ML service

class MLService {
  // Get personalized recommendations for user from ML model
  async getPersonalizedRecommendations(userId, topN = 10) {
    try {
      console.log(`[ML] Fetching personalized recommendations for user: ${userId}`);
      
      const response = await axios.post(`${ML_API_URL}/recommend/personalized`, {
        user_id: userId,
        top_n: topN
      }, {
        timeout: 10000 // 10 second timeout
      });
      
      console.log(`[ML] Received ${response.data.recommendations?.length || 0} recommendations`);
      return response.data;
    } catch (error) {
      console.error('[ML SERVICE ERROR] Personalized:', error.message);
      // Fallback to content-based recommendations
      return await this.getFallbackRecommendations(userId, topN);
    }
  }

  // Get similar products from ML model
  async getSimilarProducts(productId, topN = 10) {
    try {
      const response = await axios.post(`${ML_API_URL}/recommend/similar`, {
        product_id: productId,
        top_n: topN
      }, {
        timeout: 5000
      });
      
      return response.data;
    } catch (error) {
      console.error('[ML SERVICE ERROR] Similar:', error.message);
      return await this.getSimilarProductsFallback(productId, topN);
    }
  }

  // Get trending products with ML scoring
  async getTrendingProducts(topN = 16) {
    try {
      const Product = (await import('../models/ProductSchema.js')).default;
      const Activity = (await import('../models/ActivitySchema.js')).default;

      // Get trending products based on recent activities with ML scoring
      const trendingProducts = await Activity.aggregate([
        {
          $match: {
            type: { $in: ['purchase', 'add_to_cart', 'view'] },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
          }
        },
        {
          $group: {
            _id: '$productId',
            totalInteractions: { $sum: 1 },
            purchaseCount: {
              $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, 1, 0] }
            },
            addToCartCount: {
              $sum: { $cond: [{ $eq: ['$type', 'add_to_cart'] }, 1, 0] }
            },
            viewCount: {
              $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] }
            },
            lastInteraction: { $max: '$createdAt' },
            // Calculate ML score: purchases * 3 + add_to_cart * 2 + views * 1
            mlScore: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'purchase'] }, 
                  3,
                  { $cond: [
                    { $eq: ['$type', 'add_to_cart'] },
                    2,
                    1
                  ]}
                ]
              }
            }
          }
        },
        { $sort: { mlScore: -1, lastInteraction: -1 } },
        { $limit: topN },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            product_id: '$product._id',
            name: '$product.name',
            category: '$product.category',
            price: '$product.price',
            imageUrl: '$product.imageUrl',
            tags: '$product.tags',
            description: '$product.description',
            popularity_score: '$mlScore',
            purchase_count: '$purchaseCount',
            add_to_cart_count: '$addToCartCount',
            view_count: '$viewCount',
            total_interactions: '$totalInteractions',
            last_interaction: '$lastInteraction',
            reason: 'Trending based on user interactions'
          }
        }
      ]);

      return {
        success: true,
        recommendations: trendingProducts,
        algorithm: "ml_trending_algorithm",
        count: trendingProducts.length
      };
    } catch (error) {
      console.error('Trending products error:', error);
      return await this.getPopularProducts(topN);
    }
  }

  // Fallback when ML service is down
  async getFallbackRecommendations(userId, topN) {
    try {
      const Activity = (await import('../models/ActivitySchema.js')).default;
      const Product = (await import('../models/ProductSchema.js')).default;
      
      // Get user's recent activities
      const userActivities = await Activity.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('productId');

      if (userActivities.length === 0) {
        return await this.getPopularProducts(topN);
      }

      // Extract user preferences from activities
      const userCategories = new Set();
      const userTags = new Set();
      const viewedProducts = new Set();
      
      userActivities.forEach(activity => {
        if (activity.productId) {
          userCategories.add(activity.productId.category);
          activity.productId.tags.forEach(tag => userTags.add(tag));
          viewedProducts.add(activity.productId._id.toString());
        }
      });

      // Find products matching user's interests
      const recommendations = await Product.find({
        $and: [
          {
            $or: [
              { category: { $in: Array.from(userCategories) } },
              { tags: { $in: Array.from(userTags) } }
            ]
          },
          { _id: { $nin: Array.from(viewedProducts) } } // Exclude already viewed
        ]
      })
      .limit(topN)
      .sort({ createdAt: -1 });

      return {
        success: true,
        recommendations: recommendations.map(p => this.formatProduct(p)),
        algorithm: "content_based_fallback",
        count: recommendations.length
      };
    } catch (error) {
      console.error('Fallback recommendations error:', error);
      return await this.getPopularProducts(topN);
    }
  }

  async getSimilarProductsFallback(productId, topN) {
    try {
      const Product = (await import('../models/ProductSchema.js')).default;
      
      const product = await Product.findById(productId);
      if (!product) {
        return { success: false, recommendations: [], count: 0 };
      }

      const similarProducts = await Product.find({
        $or: [
          { category: product.category },
          { tags: { $in: product.tags } }
        ],
        _id: { $ne: productId }
      })
      .limit(topN);

      return {
        success: true,
        recommendations: similarProducts.map(p => this.formatProduct(p)),
        algorithm: "content_based_similarity",
        count: similarProducts.length
      };
    } catch (error) {
      console.error('Similar products fallback error:', error);
      return { success: true, recommendations: [], count: 0 };
    }
  }

  async getPopularProducts(topN) {
    try {
      const Product = (await import('../models/ProductSchema.js')).default;
      const Activity = (await import('../models/ActivitySchema.js')).default;

      // Get popular products based on purchase and cart activities
      const popularProducts = await Activity.aggregate([
        {
          $match: {
            type: { $in: ['purchase', 'add_to_cart'] },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
          }
        },
        {
          $group: {
            _id: '$productId',
            interactionCount: { $sum: 1 },
            lastActivity: { $max: '$createdAt' }
          }
        },
        { $sort: { interactionCount: -1, lastActivity: -1 } },
        { $limit: topN },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' }
      ]);

      return {
        success: true,
        recommendations: popularProducts.map(item => this.formatProduct(item.product)),
        algorithm: "popularity_based",
        count: popularProducts.length
      };
    } catch (error) {
      // Final fallback - just get latest products
      const Product = (await import('../models/ProductSchema.js')).default;
      const latestProducts = await Product.find()
        .sort({ createdAt: -1 })
        .limit(topN);

      return {
        success: true,
        recommendations: latestProducts.map(p => this.formatProduct(p)),
        algorithm: "latest_products",
        count: latestProducts.length
      };
    }
  }

  formatProduct(product) {
    return {
      product_id: product._id || product.product_id,
      name: product.name,
      category: product.category,
      price: product.price,
      imageUrl: product.imageUrl,
      tags: product.tags,
      description: product.description,
      score: product.score || product.popularity_score || 0.8,
      reason: product.reason || "You might like this based on your interests",
      popularity_score: product.popularity_score,
      purchase_count: product.purchase_count,
      add_to_cart_count: product.add_to_cart_count,
      view_count: product.view_count
    };
  }

  // Check if ML service is healthy
  async healthCheck() {
    try {
      const response = await axios.get(`${ML_API_URL}/health`, { timeout: 3000 });
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('[ML Health Check Error]:', error.message);
      return false;
    }
  }

  // Get "For You" recommendations (personalized for logged-in, trending for guests)
  async getForYouRecommendations(userId = null, topN = 8) {
    if (userId) {
      return await this.getPersonalizedRecommendations(userId, topN);
    } else {
      return await this.getTrendingProducts(topN);
    }
  }
}

export default new MLService();