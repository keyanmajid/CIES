import express from "express";
import Activity from "../models/ActivitySchema.js";
import Product from "../models/ProductSchema.js"; // ADD THIS IMPORT
import { verifyUser } from "../middlewares/auth.js";

const router = express.Router();

// ✅ FIXED: Add to cart activity logging
router.post("/add-to-cart", verifyUser, async (req, res) => {
    const { productId, product, sessionId } = req.body;
    
    console.log("[DEBUG] Add to cart request body:", req.body);
    
    // Check for both productId and product._id
    let actualProductId = productId;
    if (!actualProductId && product) {
        actualProductId = product._id || product.product_id || product.id;
    }

    if (!actualProductId) {
        console.error("[ERROR] No product ID found in request");
        return res.status(400).json({ 
            error: "Missing productId",
            details: "Provide either productId or product object with _id" 
        });
    }

    console.log("[DEBUG] Product ID to fetch:", actualProductId);

    try {
        // Get product details for snapshot
        let productDetails = {};
        try {
            console.log("[DEBUG] Attempting to fetch product from DB...");
            const productDoc = await Product.findById(actualProductId).select('name category tags price');
            
            if (productDoc) {
                console.log("[DEBUG] Found product:", {
                    name: productDoc.name,
                    category: productDoc.category,
                    tags: productDoc.tags,
                    price: productDoc.price
                });
                
                productDetails = {
                    name: productDoc.name,
                    category: productDoc.category,
                    tags: productDoc.tags || [],
                    price: productDoc.price
                };
            } else {
                console.error("[ERROR] Product not found in database:", actualProductId);
            }
        } catch (err) {
            console.error("[ERROR] Failed to fetch product details:", err.message);
            console.error("[ERROR] Full error:", err);
        }

        const activity = await Activity.create({
            userId: req.user.id,
            productId: actualProductId,
            type: "add_to_cart",
            sessionId: sessionId || req.sessionID,
            productSnapshot: productDetails,  // This should have data!
            context: {
                page: req.headers.referer || "unknown",
                device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 
                        req.headers['user-agent']?.includes('Tablet') ? 'tablet' : 'desktop',
                referrer: req.headers.referer
            }
        });
        
        console.log(`[ACTIVITY] Add to cart logged:`, {
            userId: req.user.id,
            productId: actualProductId,
            snapshot: productDetails  // Check if this has data!
        });
        
        res.json({ 
            success: true, 
            activity: {
                _id: activity._id,
                type: activity.type,
                productId: activity.productId,
                productSnapshot: activity.productSnapshot  // Include in response
            }
        });
    } catch (error) {
        console.error("[ERROR] Logging add_to_cart activity:", error.message);
        console.error("[DEBUG] Full error:", error);
        res.status(500).json({ 
            error: "Failed to log activity",
            details: error.message 
        });
    }
});
// ✅ FIXED: Purchase activity logging
router.post("/purchase", verifyUser, async (req, res) => {
    const { items, orderId, totalAmount } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
            error: "Missing items array in request body",
            details: "Items must be an array of products with productId and quantity" 
        });
    }

    try {
        const purchaseActivities = [];
        let successfulItems = 0;
        
        for (const item of items) {
            // Validate item structure
            if (!item.productId) {
                console.warn(`[WARNING] Item missing productId:`, item);
                continue;
            }

            const productId = item.productId._id || item.productId.product_id || item.productId.id || item.productId;
            
            try {
                // Get product details for snapshot
                let productDetails = {};
                const product = await Product.findById(productId).select('name category tags price');
                if (product) {
                    productDetails = {
                        name: product.name,
                        category: product.category,
                        tags: product.tags || [],
                        price: product.price
                    };
                }

                // Log purchase activity for each product
                const activity = await Activity.create({
                    userId: req.user.id,
                    productId: productId,
                    type: "purchase",
                    quantity: item.quantity || 1,
                    orderId: orderId,
                    totalPrice: (item.price || product?.price || 0) * (item.quantity || 1),
                    productSnapshot: productDetails,
                    context: {
                        page: req.headers.referer || "checkout",
                        device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 
                                req.headers['user-agent']?.includes('Tablet') ? 'tablet' : 'desktop'
                    }
                });
                
                purchaseActivities.push(activity);
                successfulItems++;
                console.log(`[ACTIVITY] Purchase logged: User ${req.user.id}, Product ${productId}, Quantity ${item.quantity}`);
                
            } catch (err) {
                console.error(`[ACTIVITY ERROR] Purchase for product ${item.productId}:`, err.message);
                // Continue with other items even if one fails
            }
        }

        res.json({ 
            success: successfulItems > 0,
            message: `${successfulItems} purchase activities logged successfully`,
            loggedItems: successfulItems,
            totalItems: items.length,
            activities: purchaseActivities 
        });
    } catch (error) {
        console.error("[ERROR] Purchase logging failed:", error.message);
        console.error("[DEBUG] Full error:", error);
        res.status(500).json({ 
            error: "Failed to log purchase activities",
            details: error.message 
        });
    }
});

// ✅ FIXED: View activity logging
router.post("/view", verifyUser, async (req, res) => {
    const { productId } = req.body;
    
    if (!productId) {
        return res.status(400).json({ error: "Missing productId" });
    }

    try {
        // Get product details for snapshot
        let productDetails = {};
        const product = await Product.findById(productId).select('name category tags price');
        if (product) {
            productDetails = {
                name: product.name,
                category: product.category,
                tags: product.tags || [],
                price: product.price
            };
        }

        const activity = await Activity.create({
            userId: req.user.id,
            productId: productId,
            type: "view",
            productSnapshot: productDetails,
            context: {
                page: req.headers.referer || "unknown",
                device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 
                        req.headers['user-agent']?.includes('Tablet') ? 'tablet' : 'desktop'
            }
        });
        
        console.log(`[ACTIVITY] View logged: User ${req.user.id}, Product ${productId}`);
        res.json({ success: true, activity });
    } catch (error) {
        console.error("[ERROR] Logging view activity:", error.message);
        res.status(500).json({ error: "Failed to log view activity" });
    }
});

// Get user activities
router.get("/user-activities", verifyUser, async (req, res) => {
    try {
        const { limit = 50, type } = req.query;
        
        const filter = { userId: req.user.id };
        if (type) filter.type = type;
        
        const activities = await Activity.find(filter)
            .populate('productId', 'name price imageUrl category')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        
        res.json({
            success: true,
            count: activities.length,
            activities
        });
    } catch (error) {
        console.error("[ERROR] Fetching user activities:", error.message);
        res.status(500).json({ 
            success: false,
            error: "Failed to fetch activities" 
        });
    }
});

// Get activity statistics for user
router.get("/user-stats", verifyUser, async (req, res) => {
    try {
        const stats = await Activity.aggregate([
            { $match: { userId: req.user._id } },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 },
                    lastActivity: { $max: "$createdAt" },
                    totalProducts: { $addToSet: "$productId" }
                }
            },
            {
                $project: {
                    type: "$_id",
                    count: 1,
                    lastActivity: 1,
                    uniqueProducts: { $size: "$totalProducts" },
                    _id: 0
                }
            }
        ]);
        
        // Get total counts
        const totalActivities = await Activity.countDocuments({ userId: req.user._id });
        const totalProducts = await Activity.distinct("productId", { userId: req.user._id });
        
        res.json({
            success: true,
            stats,
            totals: {
                activities: totalActivities,
                uniqueProducts: totalProducts.length
            }
        });
    } catch (error) {
        console.error("[ERROR] Fetching user stats:", error.message);
        res.status(500).json({ 
            success: false,
            error: "Failed to fetch statistics" 
        });
    }
});

// Get all activities (for managers/admins)
router.get("/", verifyUser, async (req, res) => {
    try {
        // Only allow managers/admins to see all activities
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: "Access denied. Manager/Admin role required." 
            });
        }

        const { page = 1, limit = 100, type, userId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const filter = {};
        if (type) filter.type = type;
        if (userId) filter.userId = userId;
        
        const activities = await Activity.find(filter)
            .populate('userId', 'name email role')
            .populate('productId', 'name price imageUrl')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Activity.countDocuments(filter);
        
        res.json({
            success: true,
            activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("[ERROR] Fetching all activities:", error.message);
        res.status(500).json({ 
            success: false,
            error: "Failed to fetch activities" 
        });
    }
});

// Get activity statistics (for managers)
router.get("/stats", verifyUser, async (req, res) => {
    try {
        // Only allow managers/admins
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: "Access denied. Manager/Admin role required." 
            });
        }

        const { days = 7 } = req.query;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const stats = await Activity.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 },
                    uniqueUsers: { $addToSet: "$userId" },
                    uniqueProducts: { $addToSet: "$productId" },
                    totalRevenue: { 
                        $sum: { 
                            $cond: [{ $eq: ["$type", "purchase"] }, "$totalPrice", 0]
                        }
                    }
                }
            },
            {
                $project: {
                    type: "$_id",
                    count: 1,
                    uniqueUsers: { $size: "$uniqueUsers" },
                    uniqueProducts: { $size: "$uniqueProducts" },
                    totalRevenue: 1,
                    _id: 0
                }
            }
        ]);

        // Get total activities
        const totalActivities = await Activity.countDocuments({
            createdAt: { $gte: startDate }
        });
        
        // Get conversion rate
        const cartAdds = await Activity.countDocuments({
            type: "add_to_cart",
            createdAt: { $gte: startDate }
        });
        
        const purchases = await Activity.countDocuments({
            type: "purchase",
            createdAt: { $gte: startDate }
        });
        
        const conversionRate = cartAdds > 0 ? (purchases / cartAdds * 100).toFixed(2) : 0;

        res.json({
            success: true,
            period: `${days} days`,
            startDate,
            stats,
            totals: {
                activities: totalActivities,
                conversionRate: `${conversionRate}%`
            }
        });
    } catch (error) {
        console.error("[ERROR] Fetching activity stats:", error.message);
        res.status(500).json({ 
            success: false,
            error: "Failed to fetch activity statistics" 
        });
    }
});

// Get real-time activity feed
router.get("/feed/recent", verifyUser, async (req, res) => {
    try {
        const activities = await Activity.find()
            .populate('userId', 'name email')
            .populate('productId', 'name price')
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.json({
            success: true,
            activities,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("[ERROR] Fetching activity feed:", error.message);
        res.status(500).json({ 
            success: false,
            error: "Failed to fetch activity feed" 
        });
    }
});

// Clear user activities (for testing/debugging)
router.delete("/clear-my-activities", verifyUser, async (req, res) => {
    try {
        const result = await Activity.deleteMany({ userId: req.user.id });
        
        console.log(`[ACTIVITY] Cleared ${result.deletedCount} activities for user ${req.user.id}`);
        res.json({
            success: true,
            message: `Cleared ${result.deletedCount} activities`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("[ERROR] Clearing user activities:", error.message);
        res.status(500).json({ 
            success: false,
            error: "Failed to clear activities" 
        });
    }
});

export default router;