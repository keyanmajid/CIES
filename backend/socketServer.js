// backend/socketServer.js

import { Server } from "socket.io";
import express from "express";
import Interaction from "./models/Interaction.js";

// Export Maps
export const activeCustomers = new Map();
export const activeEmployees = new Map();
export const activeInteractions = new Map();

export const router = express.Router();

// Create a variable to hold the toxicity service (will be set later)
let toxicityService = null;

// Export a function to set the service
export const setToxicityService = (service) => {
  toxicityService = service;
  console.log('✅ Toxicity service set in socketServer');
};

export const setupSocketServer = (server) => {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["polling", "websocket"],
  });

  // Helper to broadcast free employee count
  const broadcastFreeEmployees = () => {
    const freeEmployees = [...activeEmployees.values()].filter(emp => emp.status === "free").length;
    io.emit("updateFreeEmployees", { freeEmployees });
  };

  // Add debug logging for all socket events
  io.on("connection", (socket) => {
    console.log("🟢 New connection:", socket.id);

    socket.onAny((eventName, ...args) => {
      console.log(`🔍 Socket Event: ${eventName}`, args);
    });

    // ---------- REGISTER ----------
    socket.on("registerCustomer", (customerId) => {
      console.log(`📝 Registering customer: ${customerId}`);
      activeCustomers.set(customerId, socket.id);
      console.log(`📊 Active customers: ${activeCustomers.size}`);
    });

    socket.on("registerEmployee", (employeeId) => {
      console.log(`📝 Registering employee: ${employeeId}`);
      activeEmployees.set(employeeId, { socketId: socket.id, status: "free", currentCustomer: null });
      broadcastFreeEmployees();
      console.log(`📊 Active employees: ${activeEmployees.size}`);
    });

    // ---------- START INTERACTION ----------
    socket.on("startInteraction", async ({ customerId, customerName, type }) => {
      console.log(`🚀 Starting interaction for customer: ${customerId}, name: ${customerName}`);
      
      const freeEmployee = [...activeEmployees.entries()].find(([, data]) => data.status === "free");

      if (!freeEmployee) {
        console.log(`❌ No free employees available for customer: ${customerId}`);
        io.to(socket.id).emit("noEmployee", "No free employee available");
        return;
      }

      const [employeeId, empData] = freeEmployee;
      console.log(`👨‍💼 Found free employee: ${employeeId}`);
      
      io.to(empData.socketId).emit("incomingRequest", { customerId, type });

      // Create interaction with BOTH customerId and customerName
      try {
        const interaction = new Interaction({
          customerId,
          customerName,
          employeeId,
          type: type || "chat",
          messages: [],
          status: "pending",
        });

        await interaction.save();
        console.log(`✅ Interaction saved to DB with ID: ${interaction._id}`);
        
        activeInteractions.set(customerId, interaction._id);
        activeEmployees.set(employeeId, { ...empData, status: "waiting", currentCustomer: customerId });
        broadcastFreeEmployees();
        
        console.log(`📊 Active interactions: ${activeInteractions.size}`);
      } catch (error) {
        console.error("❌ Interaction Save Error:", error);
        io.to(socket.id).emit("interactionError", "Failed to start interaction due to DB error.");
      }
    });

    // ---------- ACCEPT INTERACTION ----------
    socket.on("acceptInteraction", async ({ employeeId, customerId }) => {
      console.log(`✅ Accepting interaction: employee=${employeeId}, customer=${customerId}`);
      
      const emp = activeEmployees.get(employeeId);
      if (emp) emp.status = "busy";

      const interactionId = activeInteractions.get(customerId);
      if (interactionId) {
        await Interaction.findByIdAndUpdate(interactionId, { 
          status: "active",
          employeeId: employeeId 
        });
        console.log(`📝 Interaction ${interactionId} marked as active`);
      }

      const customerSocket = activeCustomers.get(customerId);
      if (customerSocket) {
        io.to(customerSocket).emit("interactionAccepted", { employeeId });
        console.log(`📨 Notified customer ${customerId} of acceptance`);
      }

      broadcastFreeEmployees();
    });

    // ---------- REJECT INTERACTION ----------
    socket.on("rejectInteraction", async ({ employeeId, customerId }) => {
      console.log(`❌ Rejecting interaction: employee=${employeeId}, customer=${customerId}`);
      
      const emp = activeEmployees.get(employeeId);
      if (emp) emp.status = "free";

      // Forward to next free employee
      const nextFree = [...activeEmployees.entries()].find(([id, data]) => data.status === "free" && id !== employeeId);

      if (nextFree) {
        const [nextId, nextData] = nextFree;
        activeEmployees.set(nextId, { ...nextData, status: "waiting", currentCustomer: customerId });
        io.to(nextData.socketId).emit("incomingRequest", { customerId, message: "Redirected request" });
        console.log(`🔄 Redirected to next free employee: ${nextId}`);
      } else {
        const customerSocket = activeCustomers.get(customerId);
        if (customerSocket) io.to(customerSocket).emit("noEmployee", "No free employee available");
      }

      broadcastFreeEmployees();
    });

    // ---------- SEND MESSAGE ----------
    socket.on("sendMessage", async ({ sender, receiverId, text, role, customerId }) => {
      console.log(`💬 Sending message: sender=${sender}, receiver=${receiverId}, text=${text.substring(0, 50)}...`);
      
      const receiverSocket = role === "customer"
        ? activeEmployees.get(receiverId)?.socketId
        : activeCustomers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("receiveMessage", { sender, text });
        console.log(`📨 Message delivered to ${role}: ${receiverId}`);
      }

      const interactionId = activeInteractions.get(customerId);
      if (interactionId) {
        const length = text.length;
        const wordCount = text.split(/\s+/).length;

        try {
          await Interaction.findByIdAndUpdate(interactionId, {
            $push: {
              messages: { sender, text, timestamp: new Date(), length, wordCount },
            },
          });
          console.log(`💾 Message saved to interaction: ${interactionId}`);
        } catch (error) {
          console.error("❌ Error saving message to DB:", error);
        }
      } else {
        console.log(`⚠️ No active interaction found for customer: ${customerId}`);
      }
    });

    // ---------- COMPLETE INTERACTION ----------
   // In the completeInteraction socket handler:
socket.on("completeInteraction", async ({ customerId, employeeId }) => {
  try {
    const interactionId = activeInteractions.get(customerId);
    
    if (interactionId) {
      console.log(`🏁 Completing interaction: ${interactionId}`);
      
      // 1. Update interaction status in DB
      await Interaction.findByIdAndUpdate(
        interactionId,
        {
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date()
        }
      );
      
      console.log(`✅ Interaction ${interactionId} marked as completed in DB`);
      
      // 2. Notify participants
      const customerSocket = activeCustomers.get(customerId);
      if (customerSocket) {
        io.to(customerSocket).emit("interactionCompleted", {
          message: "Chat completed successfully"
        });
      }
      
      const emp = activeEmployees.get(employeeId);
      if (emp && emp.socketId) {
        io.to(emp.socketId).emit("redirectToDashboard", {
          message: "Chat completed - redirecting to dashboard",
          interactionId: interactionId
        });
        
        // Reset employee status
        activeEmployees.set(employeeId, {
          ...emp,
          status: "free",
          currentCustomer: null
        });
      }
      
      // 3. Clean up
      activeInteractions.delete(customerId);
      broadcastFreeEmployees();
      
      console.log(`✅ Interaction ${interactionId} completed successfully`);
      
      // 4. 🔥 TRIGGER ML SERVICE (NON-BLOCKING)
      setTimeout(() => {
        if (toxicityService && typeof toxicityService.processCompletedInteraction === 'function') {
          console.log(`🤖 Triggering ML service for toxicity analysis: ${interactionId}`);
          toxicityService.processCompletedInteraction(interactionId)
            .then(result => {
              if (result) {
                console.log(`✅ ML analysis completed for ${interactionId}`);
              }
            })
            .catch(err => {
              console.error("❌ ML service error:", err);
            });
        }
      }, 1000); // Wait 1 second before triggering
      
    }
  } catch (error) {
    console.error("❌ Error completing interaction:", error);
  }
});

    // ---------- FORCE COMPLETE INTERACTION ----------
    socket.on("forceCompleteInteraction", async ({ customerId, reason = "System forced completion" }) => {
      try {
        console.log(`🔧 Force completing interaction for customer: ${customerId}, reason: ${reason}`);
        
        const interactionId = activeInteractions.get(customerId);
        
        if (interactionId) {
          const interaction = await Interaction.findById(interactionId);
          if (interaction && interaction.status === "active") {
            const employeeId = interaction.employeeId;

            // Update interaction
            await Interaction.findByIdAndUpdate(interactionId, {
              status: "completed",
              completedAt: new Date(),
              updatedAt: new Date(),
              completionReason: reason
            });

            // Notify customer
            const customerSocket = activeCustomers.get(customerId);
            if (customerSocket) {
              io.to(customerSocket).emit("interactionCompleted", {
                message: `Chat completed: ${reason}`
              });
            }

            // Notify employee and reset status
            const emp = activeEmployees.get(employeeId);
            if (emp && emp.socketId) {
              io.to(emp.socketId).emit("redirectToDashboard", {
                message: `Chat completed: ${reason}`,
                interactionId: interactionId,
                customerId: customerId
              });

              activeEmployees.set(employeeId, {
                ...emp,
                status: "free",
                currentCustomer: null
              });
            }

            // Clean up
            activeInteractions.delete(customerId);
            broadcastFreeEmployees();

            console.log(`🔧 Force completed interaction ${interactionId}: ${reason}`);
          }
        }
      } catch (error) {
        console.error("❌ Error force completing interaction:", error);
      }
    });

    // ---------- DISCONNECT ----------
    socket.on("disconnect", () => {
      console.log("🔴 Connection disconnected:", socket.id);
      
      // Handle employee disconnect
      for (const [employeeId, data] of activeEmployees.entries()) {
        if (data.socketId === socket.id) {
          console.log(`👨‍💼 Employee disconnected: ${employeeId}`);
          // If employee was in an active interaction, complete it
          if (data.status === "busy" && data.currentCustomer) {
            const customerId = data.currentCustomer;
            socket.broadcast.emit("forceCompleteInteraction", { 
              customerId, 
              reason: "Employee disconnected" 
            });
            console.log(`⚠️ Force completing interaction for customer: ${customerId}`);
          }
          activeEmployees.delete(employeeId);
        }
      }

      // Handle customer disconnect
      for (const [customerId, sId] of activeCustomers.entries()) {
        if (sId === socket.id) {
          console.log(`👤 Customer disconnected: ${customerId}`);
          // If customer was in an active interaction, complete it
          const interactionId = activeInteractions.get(customerId);
          if (interactionId) {
            socket.broadcast.emit("forceCompleteInteraction", { 
              customerId, 
              reason: "Customer disconnected" 
            });
            console.log(`⚠️ Force completing interaction for customer: ${customerId}`);
          }
          activeCustomers.delete(customerId);
        }
      }

      broadcastFreeEmployees();
      console.log(`📊 Remaining: ${activeEmployees.size} employees, ${activeCustomers.size} customers`);
    });
  });

  return io;
};

// ---------- ML Dataset Endpoint ----------
router.get("/ml-dataset", async (req, res) => {
  try {
    const interactions = await Interaction.find({ status: "completed" }).lean();

    const dataset = interactions.flatMap((i) =>
      i.messages.map((msg) => ({
        customerId: i.customerId,
        employeeId: i.employeeId,
        type: i.type,
        sender: msg.sender,
        text: msg.text,
        length: msg.length,
        wordCount: msg.wordCount,
        sentimentScore: i.sentimentScore || 0,
        personalInfoFlag: i.personalInfoFlag,
        badLanguageFlag: i.badLanguageFlag,
      }))
    );

    res.json(dataset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to generate ML dataset" });
  }
});