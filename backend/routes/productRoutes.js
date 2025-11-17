import express from "express";
import Product from "../models/ProductSchema.js";
import Activity from "../models/ActivitySchema.js";
import { verifyUser, optionalAuth } from "../middlewares/auth.js";

const router = express.Router();

// Add new product
router.post("/", async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ message: "Product created", product });
    } catch (e) {
        console.error("[ERROR] Creating product:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Get all products
router.get("/", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (e) {
        console.error("[ERROR] Fetching products:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Fixed SEARCH API
router.get("/search", optionalAuth, async (req, res) => {
    const query = req.query.query;
    if (!query) return res.status(400).json({ error: "Missing search query parameter" });

    try {
        const results = await Product.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } },
                { category: { $regex: query, $options: "i" } },
                { tags: { $regex: query, $options: "i" } }
            ]
        });

        console.log(`[DEBUG] User in request:`, req.user);
        console.log(`[DEBUG] User ID:`, req.user?.id);

        // Log search activity only if user exists
        if (req.user?.id) {
            try {
                const activity = await Activity.create({
                    userId: req.user.id,
                    type: "search",
                    searchQuery: query
                });
                console.log(`[SUCCESS] Search activity logged:`, activity);
            } catch (err) {
                console.error("[Activity Logging ERROR] Search:", err.message);
                console.error("[DEBUG] Full error:", err);
            }
        } else {
            console.log(`[DEBUG] No user ID found, skipping activity logging`);
        }

        res.json(results);
    } catch (error) {
        console.error("[ERROR] Product search failed:", error.message);
        res.status(500).json({ error: "Search failed" });
    }
});

// Get product by ID
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found" });
        res.json(product);
    } catch (e) {
        console.error("[ERROR] Fetching product by ID:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Fixed Purchase product (requires auth)
router.post("/purchase", verifyUser, async (req, res) => {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: "Missing productId in request body." });

    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ error: "Product not found" });

        // Log purchase activity
        try {
            const activity = await Activity.create({
                userId: req.user.id,
                productId: product._id,
                type: "purchase"
            });
            console.log(`[SUCCESS] Purchase activity logged:`, activity);
        } catch (err) {
            console.error("[Activity Logging ERROR] Purchase:", err.message);
        }

        res.json({ message: "Purchase logged successfully" });
    } catch (error) {
        console.error("[ERROR] Purchase failed:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Test route for all activity types
router.post("/test-all-activities", verifyUser, async (req, res) => {
    try {
        const mongoose = await import("mongoose");
        const testUserId = req.user.id;
        const testProductId = new mongoose.default.Types.ObjectId();

        // Test search activity
        const searchActivity = await Activity.create({
            userId: testUserId,
            type: "search",
            searchQuery: "test query"
        });

        // Test add_to_cart activity
        const cartActivity = await Activity.create({
            userId: testUserId,
            productId: testProductId,
            type: "add_to_cart"
        });

        // Test purchase activity
        const purchaseActivity = await Activity.create({
            userId: testUserId,
            productId: testProductId,
            type: "purchase"
        });

        console.log("All test activities created successfully");
        res.json({ 
            success: true, 
            activities: { 
                search: searchActivity, 
                add_to_cart: cartActivity, 
                purchase: purchaseActivity 
            } 
        });
    } catch (error) {
        console.error("Test activities error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get user activities (for testing)
router.get("/user-activities/:userId", verifyUser, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Only allow users to see their own activities or managers to see all
        if (req.user.id !== userId && req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied" });
        }

        const activities = await Activity.find({ userId })
            .populate('productId', 'name price')
            .sort({ createdAt: -1 });
        
        res.json({ success: true, activities });
    } catch (error) {
        console.error("[ERROR] Fetching user activities:", error.message);
        res.status(500).json({ error: "Failed to fetch activities" });
    }
});

// Get activity statistics (for managers)
router.get("/activities/stats", verifyUser, async (req, res) => {
    try {
        // Only allow managers/admins
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied" });
        }

        const stats = await Activity.aggregate([
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 },
                    latest: { $max: "$createdAt" }
                }
            }
        ]);

        const totalActivities = await Activity.countDocuments();
        
        res.json({
            success: true,
            stats,
            totalActivities
        });
    } catch (error) {
        console.error("[ERROR] Fetching activity stats:", error.message);
        res.status(500).json({ error: "Failed to fetch activity statistics" });
    }
});

export default router;