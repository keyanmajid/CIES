// routes/predictionRoutes.js
import express from "express";
import fetch from "node-fetch";
import { MongoClient } from "mongodb";

const router = express.Router();

// CORRECT URLs based on your FastAPI code
const PROFIT_ML_SERVICE_URL = 'https://keyanmajid-profitml.hf.space';
const CUSTOMER_ML_SERVICE_URL = 'https://keyanmajid-customermlcies.hf.space';
const MONGODB_URI = "mongodb+srv://keyanmajid57:.$iloveyou3000@cluster0.v1y4f9x.mongodb.net/cies?retryWrites=true&w=majority";

// Database connection helper
async function connectDB() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    return { client, db: client.db("cies") };
}

// Test connection with proper error handling
async function testConnection(url, serviceName) {
    try {
        console.log(`🔍 Testing ${serviceName} at ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Dashboard-App/1.0'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ ${serviceName} response:`, data);
        return { success: true, data };
    } catch (error) {
        console.error(`❌ ${serviceName} connection failed:`, error.message);
        return { success: false, error: error.message };
    }
}

// 1. CHECK PROFIT ML SERVICE STATUS
router.get("/ml-status", async (req, res) => {
    try {
        const result = await testConnection(PROFIT_ML_SERVICE_URL, "Profit ML Service");
        
        res.json({
            success: result.success,
            ml_service: result.success ? "Connected" : "Disconnected",
            ml_info: result.data || null,
            error: result.error || null,
            timestamp: new Date().toISOString(),
            service_url: PROFIT_ML_SERVICE_URL
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            ml_service: "Disconnected",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 2. CHECK CUSTOMER ML SERVICE STATUS
router.get("/customer-status", async (req, res) => {
    try {
        // Test basic connection first
        const connectionTest = await testConnection(CUSTOMER_ML_SERVICE_URL, "Customer ML Service");
        
        if (!connectionTest.success) {
            throw new Error(`Service unavailable: ${connectionTest.error}`);
        }
        
        // Now try the /status endpoint
        console.log("🔍 Checking Customer ML status endpoint...");
        const statusResponse = await fetch(`${CUSTOMER_ML_SERVICE_URL}/status`, {
            timeout: 10000,
            headers: { 'Accept': 'application/json' }
        });
        
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            
            return res.json({
                success: true,
                ml_service: statusData.model_available ? "Connected & Trained" : "Connected",
                ...statusData,
                timestamp: new Date().toISOString(),
                service_url: CUSTOMER_ML_SERVICE_URL
            });
        } else {
            // If /status fails, return basic connection info
            return res.json({
                success: true,
                ml_service: "Connected (Basic)",
                message: connectionTest.data?.message || "Service running",
                status: "running",
                timestamp: new Date().toISOString(),
                note: "/status endpoint returned HTTP " + statusResponse.status
            });
        }
        
    } catch (error) {
        console.error("Customer ML service check failed:", error.message);
        
        // Check database for fallback
        try {
            const { client, db } = await connectDB();
            const profitlogs = db.collection("profitlogs");
            
            const latestRecord = await profitlogs
                .find({ customerCount: { $exists: true } })
                .sort({ date: -1 })
                .limit(1)
                .toArray();
            
            await client.close();
            
            const customerCount = latestRecord[0]?.customerCount || 0;
            
            res.json({
                success: false,
                ml_service: "Disconnected (Using Database Fallback)",
                current_customer_count: customerCount,
                error: error.message,
                fallback: true,
                timestamp: new Date().toISOString()
            });
            
        } catch (dbError) {
            res.status(503).json({
                success: false,
                ml_service: "Disconnected",
                current_customer_count: 0,
                error: `ML: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
    }
});

// 3. GET CURRENT CUSTOMER COUNT
router.get("/current-customer-count-only", async (req, res) => {
    try {
        console.log("🔍 Fetching current customer count...");
        
        // Try your ML service endpoint
        const response = await fetch(`${CUSTOMER_ML_SERVICE_URL}/current-count-only`, {
            timeout: 10000,
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                return res.json({
                    success: true,
                    current_customer_count: data.current_customer_count || 0,
                    source: "ml_service"
                });
            }
        }
        
        throw new Error(`ML service returned ${response.status}`);
        
    } catch (error) {
        console.error("ML service failed, trying database:", error.message);
        
        // Fallback to database
        try {
            const { client, db } = await connectDB();
            const profitlogs = db.collection("profitlogs");
            
            const latestRecord = await profitlogs
                .find({ customerCount: { $exists: true } })
                .sort({ date: -1 })
                .limit(1)
                .toArray();
            
            await client.close();
            
            const customerCount = latestRecord[0]?.customerCount || 1000;
            
            res.json({
                success: true,
                current_customer_count: customerCount,
                source: "database_fallback",
                note: "ML service unavailable, using database"
            });
            
        } catch (dbError) {
            console.error("Database fallback failed:", dbError.message);
            
            res.json({
                success: true,
                current_customer_count: 1000,
                source: "default_fallback",
                note: "Using default value"
            });
        }
    }
});

// 4. PREDICT CUSTOMERS (Next Day)
router.post("/predict-customers", async (req, res) => {
    try {
        const { months = 1 } = req.body;
        console.log("🤖 Predicting customers for next day...");
        
        // Use your actual endpoint
        const response = await fetch(`${CUSTOMER_ML_SERVICE_URL}/predict-next-day`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.prediction) {
            return res.json({
                success: true,
                prediction: result.prediction,
                source: "ml_service",
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error("Invalid response from ML service");
        }
        
    } catch (error) {
        console.error("Customer prediction failed:", error.message);
        
        // Generate simulated prediction
        const nextDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const simulatedPrediction = {
            date: nextDate.toISOString(),
            predicted_customer_count: Math.round(1000 + Math.random() * 500),
            model_used: 'simulation',
            prediction_date: new Date().toISOString(),
            based_on_last_days: 7,
            data_status: 'simulated',
            note: "ML service error: " + error.message
        };
        
        res.json({
            success: true,
            prediction: simulatedPrediction,
            source: "simulation",
            simulated: true,
            timestamp: new Date().toISOString()
        });
    }
});

// 5. PREDICT TOMORROW SALES
router.get("/predict-tomorrow", async (req, res) => {
    try {
        console.log("💰 Predicting tomorrow's sales...");
        
        const response = await fetch(`${PROFIT_ML_SERVICE_URL}/predict-tomorrow-sales`, {
            timeout: 15000,
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const prediction = await response.json();
        
        // Handle insufficient data response
        if (prediction.message && prediction.message.includes("Not enough data")) {
            return res.json({
                success: false,
                error: "insufficient_data",
                message: prediction.message
            });
        }
        
        console.log("✅ Prediction received:", prediction);
        
        res.json({
            success: true,
            prediction: prediction,
            message: "Prediction generated successfully",
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("Sales prediction failed:", error.message);
        
        // Generate simulated prediction
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const simulatedPrediction = {
            date: tomorrow.toISOString(),
            predictedSales: 5000 + Math.random() * 3000,
            confidence: 0.75,
            note: "Simulated prediction"
        };
        
        res.json({
            success: true,
            prediction: simulatedPrediction,
            message: "Simulated prediction (ML service error)",
            simulated: true,
            timestamp: new Date().toISOString()
        });
    }
});

// 6. GET SALES DATA
router.get("/sales/data", async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    
    try {
        const { client, db } = await connectDB();
        const profitlogs = db.collection("profitlogs");
        
        console.log("📊 Fetching sales data from database...");
        
        const records = await profitlogs
            .find({})
            .sort({ date: -1 })
            .limit(limit)
            .toArray();
        
        await client.close();
        
        const formatted = records.map(r => ({
            ...r,
            _id: r._id.toString(),
            date: new Date(r.date).toISOString(),
            totalSales: r.totalSales || 0,
            predictedSales: r.predictedSales || null,
            customerCount: r.customerCount || null
        }));
        
        console.log(`✅ Found ${formatted.length} records`);
        
        res.json({
            success: true,
            records: formatted.reverse(),
            count: formatted.length,
            source: "database",
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("Error loading sales data:", error.message);
        
        // Generate sample data
        const sampleData = [];
        const today = new Date();
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            const sales = 3000 + Math.random() * 2000;
            sampleData.push({
                _id: `sample_${i}`,
                date: date.toISOString(),
                totalSales: sales,
                predictedSales: sales * (0.9 + Math.random() * 0.2),
                isSample: true
            });
        }
        
        res.json({
            success: true,
            records: sampleData,
            count: sampleData.length,
            source: "sample_data",
            error: "Database unavailable, showing sample data",
            timestamp: new Date().toISOString()
        });
    }
});

// 7. ADD SALES ENTRY
router.post("/sales/add", async (req, res) => {
    const { date, totalSales } = req.body;
    
    if (!date || typeof totalSales !== "number") {
        return res.status(400).json({
            success: false,
            error: "Invalid data. Required: date (ISO), totalSales (number)"
        });
    }
    
    try {
        const { client, db } = await connectDB();
        const profitlogs = db.collection("profitlogs");
        
        const record = {
            date: new Date(date),
            totalSales,
            predictedSales: null,
            createdAt: new Date(),
        };
        
        const result = await profitlogs.insertOne(record);
        
        await client.close();
        
        // Also try to update ML service if available
        try {
            await fetch(`${PROFIT_ML_SERVICE_URL}/update-sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, totalSales }),
                timeout: 3000
            });
        } catch (mlError) {
            console.log("ML service update optional:", mlError.message);
        }
        
        res.json({
            success: true,
            record: {
                _id: result.insertedId.toString(),
                date: record.date.toISOString(),
                totalSales,
                predictedSales: null
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("Error adding sales:", error.message);
        
        res.status(500).json({
            success: false,
            error: "Failed to add sales data",
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 8. ADD CUSTOMER DATA
router.post("/add-customer-data", async (req, res) => {
    const { date, customerCount } = req.body;
    
    if (!date || typeof customerCount !== "number") {
        return res.status(400).json({
            success: false,
            error: "Invalid data. Required: date (ISO), customerCount (number)"
        });
    }
    
    try {
        // First add to ML service if available
        let mlResult = null;
        try {
            const mlResponse = await fetch(`${CUSTOMER_ML_SERVICE_URL}/add-customer-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, customerCount }),
                timeout: 10000
            });
            
            if (mlResponse.ok) {
                mlResult = await mlResponse.json();
                console.log("✅ Customer data sent to ML service");
            }
        } catch (mlError) {
            console.log("ML service update optional:", mlError.message);
        }
        
        // Also store in database
        const { client, db } = await connectDB();
        const profitlogs = db.collection("profitlogs");
        
        const record = {
            date: new Date(date),
            customerCount,
            createdAt: new Date(),
        };
        
        const dbResult = await profitlogs.insertOne(record);
        
        await client.close();
        
        res.json({
            success: true,
            message: "Customer data added successfully",
            record: {
                _id: dbResult.insertedId.toString(),
                date: record.date.toISOString(),
                customerCount
            },
            ml_service_result: mlResult,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("Error adding customer data:", error.message);
        
        res.status(500).json({
            success: false,
            error: "Failed to add customer data",
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 9. HEALTH CHECK ENDPOINT
router.get("/health", async (req, res) => {
    try {
        const [profitML, customerML] = await Promise.allSettled([
            testConnection(PROFIT_ML_SERVICE_URL, "Profit ML"),
            testConnection(CUSTOMER_ML_SERVICE_URL, "Customer ML")
        ]);
        
        // Test database connection
        let dbHealthy = false;
        try {
            const { client } = await connectDB();
            await client.close();
            dbHealthy = true;
        } catch (dbError) {
            console.error("Database health check failed:", dbError.message);
        }
        
        res.json({
            success: true,
            services: {
                profit_ml: {
                    healthy: profitML.status === 'fulfilled' && profitML.value.success,
                    status: profitML.status === 'fulfilled' ? profitML.value.data?.message || "Connected" : "Failed",
                    error: profitML.status === 'rejected' ? profitML.reason : profitML.value?.error
                },
                customer_ml: {
                    healthy: customerML.status === 'fulfilled' && customerML.value.success,
                    status: customerML.status === 'fulfilled' ? customerML.value.data?.message || "Connected" : "Failed",
                    error: customerML.status === 'rejected' ? customerML.reason : customerML.value?.error
                },
                database: {
                    healthy: dbHealthy,
                    status: dbHealthy ? "Connected" : "Disconnected"
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Health check failed: " + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;