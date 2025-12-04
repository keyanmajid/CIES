import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import path from "path"; // 👈 NEW: Import path for resolving file paths
import { fileURLToPath } from 'url'; // 👈 NEW: For ES Modules __dirname support

import managerRoutes from "./routes/managerRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import interactionRoutes from "./routes/interactionRoutes.js";
import { setupSocketServer, activeEmployees, activeCustomers, activeInteractions } from "./socketServer.js";
import productRoutes from './routes/productRoutes.js';
import activityRoutes from './routes/activities.js';
import predictionRoutes from "./routes/prediction.js";
import employeeDashboardRoutes from "./routes/employeeDashboardRoutes.js"; // ✅ Add this import
import recommendationRoutes from './routes/recommendations.js';
// import orderRoutes from "./routes/orderRoutes.js";
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware to configure CORS and JSON parsing 
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

// Routes
app.use("/api/manager", managerRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/interaction", interactionRoutes);
app.use("/api/products", productRoutes);
app.use('/api/activities', activityRoutes);
app.use("/api/prediction", predictionRoutes); // ✅ Prediction API
app.use("/api/dashboard", employeeDashboardRoutes); // ✅ Add this route mounting
app.use('/api/recommendations', recommendationRoutes);
// Test route
app.get("/api/test", (req, res) => res.json({ message: "API is working!" }));

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
// -----------------------------------------------------------------
// 2. STATIC FILES & CLIENT-SIDE ROUTING FALLBACK - MUST BE LAST
// -----------------------------------------------------------------

// Assumes your built React app is located at '../frontend/dist' relative to the backend.
// Adjust the path below if your frontend build folder is named differently or located elsewhere.
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');

// Serve static assets from the React build folder
app.use(express.static(frontendPath));

// Fallback: For any request that didn't match an API route above, 
// serve the index.html file to enable client-side routing.
app.get('*', (req, res) => {
    // This is the line that was missing!
    res.sendFile(path.resolve(frontendPath, 'index.html'));
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ DB Connected"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

// ✅ Setup Socket.io server
setupSocketServer(server);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));