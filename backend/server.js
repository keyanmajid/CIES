// backend/server.js

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from 'url';

import managerRoutes from "./routes/managerRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import interactionRoutes from "./routes/interactionRoutes.js";
import { setupSocketServer, setToxicityService, activeEmployees, activeCustomers, activeInteractions } from "./socketServer.js";
import productRoutes from './routes/productRoutes.js';
import activityRoutes from './routes/activities.js';
import predictionRoutes from "./routes/prediction.js";
import employeeDashboardRoutes from "./routes/employeeDashboardRoutes.js";
import recommendationRoutes from './routes/recommendations.js';
import employeeToxicityRoutes from './routes/employeeToxicityRoutes.js';
import satisfactionRoutes from './routes/satisfactionRoutes.js';
// ✅ Import the INSTANCE (already created)
import toxicityService from "./service/EmployeeToxicityService.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log every request
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files
app.use('/public', express.static('public'));

// ✅ Toxicity service is already loaded as singleton
console.log('✅ Employee Toxicity Service loaded');

// ✅ Make toxicity service available to routes
app.set('toxicityService', toxicityService);

// Routes
app.use("/api/manager", managerRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/interaction", interactionRoutes);
app.use("/api/products", productRoutes);
app.use('/api/activities', activityRoutes);
app.use("/api/prediction", predictionRoutes);
app.use("/api/dashboard", employeeDashboardRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use("/api/employee-toxicity", employeeToxicityRoutes);
app.use('/api/satisfaction', satisfactionRoutes);

// Test route
app.get("/api/test", (req, res) => res.json({ 
  message: "API is working!",
  toxicityService: toxicityService ? "Active" : "Inactive",
  timestamp: new Date().toISOString()
}));

app.post("/api/test-toxicity/:interactionId", async (req, res) => {
  try {
    const { interactionId } = req.params;
    
    if (!toxicityService) {
      return res.json({ error: "Toxicity service not available" });
    }
    
    console.log(`🧪 Manually triggering toxicity analysis for: ${interactionId}`);
    
    const result = await toxicityService.processCompletedInteraction(interactionId);
    
    res.json({
      success: true,
      message: "Toxicity analysis triggered",
      result: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check if interactions are being saved
app.get("/api/debug/interactions", async (req, res) => {
  try {
    const interactions = await Interaction.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    res.json({
      total: await Interaction.countDocuments(),
      recent: interactions.map(i => ({
        _id: i._id,
        customerId: i.customerId,
        customerName: i.customerName,
        employeeId: i.employeeId,
        status: i.status,
        messageCount: i.messages?.length || 0,
        createdAt: i.createdAt,
        completedAt: i.completedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Debug endpoints for socket status
app.get("/api/debug/socket-status", (req, res) => {
  const status = {
    activeEmployees: [...activeEmployees.entries()].map(([id, data]) => ({
      employeeId: id,
      socketId: data.socketId,
      status: data.status,
      currentCustomer: data.currentCustomer
    })),
    activeCustomers: [...activeCustomers.entries()].map(([id, socketId]) => ({
      customerId: id,
      socketId: socketId
    })),
    activeInteractions: [...activeInteractions.entries()].map(([custId, interactionId]) => ({
      customerId: custId,
      interactionId: interactionId
    })),
    summary: {
      totalEmployees: activeEmployees.size,
      freeEmployees: [...activeEmployees.values()].filter(emp => emp.status === "free").length,
      waitingEmployees: [...activeEmployees.values()].filter(emp => emp.status === "waiting").length,
      busyEmployees: [...activeEmployees.values()].filter(emp => emp.status === "busy").length,
      totalCustomers: activeCustomers.size,
      totalInteractions: activeInteractions.size
    },
    toxicityService: {
      available: !!toxicityService,
      ioSet: !!toxicityService.io,
      apiUrl: toxicityService.apiUrl || 'Not set'
    }
  };
  
  res.json(status);
});

// ✅ Clear all socket data (for testing)
app.delete("/api/debug/clear-sockets", (req, res) => {
  activeEmployees.clear();
  activeCustomers.clear();
  activeInteractions.clear();
  res.json({ message: "All socket data cleared" });
});

// ✅ Toxicity service status endpoint
app.get("/api/debug/toxicity-status", async (req, res) => {
  try {
    if (!toxicityService) {
      return res.json({
        service: "EmployeeToxicityService",
        available: false,
        error: "Service not loaded",
        timestamp: new Date().toISOString()
      });
    }

    const status = await toxicityService.checkSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      service: "EmployeeToxicityService",
      available: false,
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------------------------------------------------
// 2. STATIC FILES & CLIENT-SIDE ROUTING FALLBACK - MUST BE LAST
// -----------------------------------------------------------------

const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// Fallback for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.resolve(frontendPath, 'index.html'));
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ DB Connected"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

// ✅ Setup Socket.io server and get io instance
const io = setupSocketServer(server);
console.log("✅ Socket.IO server setup complete");

// ✅ Set the io instance in the toxicity service
if (toxicityService && typeof toxicityService.setIoInstance === 'function') {
  toxicityService.setIoInstance(io);
  console.log("✅ Socket.IO instance injected into toxicity service");
} else {
  console.error("❌ Toxicity service or setIoInstance method not available");
}

// ✅ Set the toxicity service in socketServer
if (typeof setToxicityService === 'function') {
  setToxicityService(toxicityService);
  console.log("✅ Toxicity service injected into socket server");
} else {
  console.error("❌ setToxicityService function not found in socketServer");
}

// ✅ Optional: Make io available globally if needed
app.set('socketIo', io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Toxicity API URL: ${toxicityService?.apiUrl || 'http://localhost:8001'}`);
  console.log(`🔗 Debug endpoints:`);
  console.log(`   - http://localhost:${PORT}/api/debug/socket-status`);
  console.log(`   - http://localhost:${PORT}/api/debug/toxicity-status`);
  console.log(`   - http://localhost:${PORT}/api/test`);
});