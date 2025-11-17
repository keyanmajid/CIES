import express from "express";
import Activity from "../models/ActivitySchema.js";
import { verifyUser } from "../middlewares/auth.js";

const router = express.Router();

// Log add_to_cart activity
router.post("/add-to-cart", verifyUser, async (req, res) => {
    const { productId } = req.body;
    
    if (!productId) {
        return res.status(400).json({ error: "Missing productId" });
    }

    try {
        const activity = await Activity.create({
            userId: req.user.id,
            productId: productId,
            type: "add_to_cart"
        });
        
        console.log(`[SUCCESS] Add to cart activity logged for user ${req.user.id}`);
        res.json({ success: true, activity });
    } catch (error) {
        console.error("[ERROR] Logging add_to_cart activity:", error.message);
        res.status(500).json({ error: "Failed to log activity" });
    }
});

// Log purchase activity (alternative to the one in products.js)
router.post("/purchase", verifyUser, async (req, res) => {
    const { items, orderId, totalAmount } = req.body; // ✅ Now accepts multiple items
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Missing items array in request body." });
    }

    try {
        // Log purchase activity for EACH item in the cart
        const purchaseActivities = [];
        
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                console.warn(`[WARNING] Product not found: ${item.productId}`);
                continue; // Skip but continue with other items
            }

            // Log individual purchase activity for each product
            try {
                const activity = await Activity.create({
                    userId: req.user.id,
                    productId: product._id,
                    type: "purchase",
                    quantity: item.quantity, // ✅ Log quantity purchased
                    orderId: orderId, // ✅ Optional: track which order this belongs to
                    totalPrice: item.price * item.quantity // ✅ Optional: log price
                });
                purchaseActivities.push(activity);
                console.log(`[SUCCESS] Purchase activity logged for product: ${product.name}, quantity: ${item.quantity}`);
            } catch (err) {
                console.error(`[Activity Logging ERROR] Purchase for product ${item.productId}:`, err.message);
            }
        }

        res.json({ 
            message: "Purchase logged successfully", 
            loggedItems: purchaseActivities.length,
            activities: purchaseActivities 
        });
    } catch (error) {
        console.error("[ERROR] Purchase failed:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get user activities
router.get("/user-activities", verifyUser, async (req, res) => {
    try {
        const activities = await Activity.find({ userId: req.user.id })
            .populate('productId')
            .sort({ createdAt: -1 });
        
        res.json(activities);
    } catch (error) {
        console.error("[ERROR] Fetching user activities:", error.message);
        res.status(500).json({ error: "Failed to fetch activities" });
    }
});

// Get all activities (for managers/admins)
router.get("/", verifyUser, async (req, res) => {
    try {
        // Only allow managers/admins to see all activities
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied" });
        }

        const activities = await Activity.find()
            .populate('userId', 'name email')
            .populate('productId', 'name price')
            .sort({ createdAt: -1 });
        
        res.json(activities);
    } catch (error) {
        console.error("[ERROR] Fetching all activities:", error.message);
        res.status(500).json({ error: "Failed to fetch activities" });
    }
});

export default router;