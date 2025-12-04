// backend/socketServer.js
import { Server } from "socket.io";
import express from "express";
import Interaction from "./models/Interaction.js";

// Export Maps
export const activeCustomers = new Map();
export const activeEmployees = new Map();
export const activeInteractions = new Map();

export const router = express.Router();

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

  io.on("connection", (socket) => {
    console.log("🟢 New connection:", socket.id);

    // ---------- REGISTER ----------
    socket.on("registerCustomer", (customerId) => {
      activeCustomers.set(customerId, socket.id);
    });

    socket.on("registerEmployee", (employeeId) => {
      activeEmployees.set(employeeId, { socketId: socket.id, status: "free", currentCustomer: null });
      broadcastFreeEmployees();
    });

    // ---------- START INTERACTION ----------
    // In your socketServer.js, update the startInteraction event:
socket.on("startInteraction", async ({ customerId, customerName, type }) => {
  const freeEmployee = [...activeEmployees.entries()].find(([, data]) => data.status === "free");

  if (!freeEmployee) {
    io.to(socket.id).emit("noEmployee", "No free employee available");
    return;
  }

  const [employeeId, empData] = freeEmployee;
  io.to(empData.socketId).emit("incomingRequest", { customerId, type });

  // Create interaction with BOTH customerId and customerName
  const interaction = new Interaction({
    customerId, // SAVE THIS
    customerName,
    employeeId,
    type,
    messages: [],
    status: "pending",
  });

  try {
    await interaction.save();
  } catch (error) {
    console.error("❌ Interaction Save Error:", error);
    io.to(socket.id).emit("interactionError", "Failed to start interaction due to DB error.");
    return;
  }

  activeInteractions.set(customerId, interaction._id);
  activeEmployees.set(employeeId, { ...empData, status: "waiting", currentCustomer: customerId });
  broadcastFreeEmployees();
});
    // ---------- ACCEPT INTERACTION ----------
    socket.on("acceptInteraction", async ({ employeeId, customerId }) => {
      const emp = activeEmployees.get(employeeId);
      if (emp) emp.status = "busy";

      const interactionId = activeInteractions.get(customerId);
      if (interactionId) await Interaction.findByIdAndUpdate(interactionId, { status: "active" });

      const customerSocket = activeCustomers.get(customerId);
      if (customerSocket) io.to(customerSocket).emit("interactionAccepted", { employeeId });

      broadcastFreeEmployees();
    });

    // ---------- REJECT INTERACTION ----------
    socket.on("rejectInteraction", async ({ employeeId, customerId }) => {
      const emp = activeEmployees.get(employeeId);
      if (emp) emp.status = "free";

      // Forward to next free employee
      const nextFree = [...activeEmployees.entries()].find(([id, data]) => data.status === "free" && id !== employeeId);

      if (nextFree) {
        const [nextId, nextData] = nextFree;
        activeEmployees.set(nextId, { ...nextData, status: "waiting", currentCustomer: customerId });
        io.to(nextData.socketId).emit("incomingRequest", { customerId, message: "Redirected request" });
      } else {
        const customerSocket = activeCustomers.get(customerId);
        if (customerSocket) io.to(customerSocket).emit("noEmployee", "No free employee available");
      }

      broadcastFreeEmployees();
    });

    // ---------- SEND MESSAGE ----------
    socket.on("sendMessage", async ({ sender, receiverId, text, role, customerId }) => {
      const receiverSocket = role === "customer"
        ? activeEmployees.get(receiverId)?.socketId
        : activeCustomers.get(receiverId);

      if (receiverSocket) io.to(receiverSocket).emit("receiveMessage", { sender, text });

      const interactionId = activeInteractions.get(customerId);
      if (interactionId) {
        const length = text.length;
        const wordCount = text.split(/\s+/).length;

        await Interaction.findByIdAndUpdate(interactionId, {
          $push: {
            messages: { sender, text, timestamp: new Date(), length, wordCount },
          },
        });
      }
    });

    // ---------- COMPLETE INTERACTION ----------
    socket.on("completeInteraction", async ({ customerId, employeeId }) => {
      try {
        const interactionId = activeInteractions.get(customerId);
        
        if (interactionId) {
          // Update interaction status to completed
          await Interaction.findByIdAndUpdate(interactionId, {
            status: "completed",
            completedAt: new Date(),
            updatedAt: new Date()
          });

          // Notify customer that interaction is completed
          const customerSocket = activeCustomers.get(customerId);
          if (customerSocket) {
            io.to(customerSocket).emit("interactionCompleted", {
              message: "Chat completed successfully"
            });
          }

          // Notify employee to redirect to dashboard
          const emp = activeEmployees.get(employeeId);
          if (emp && emp.socketId) {
            io.to(emp.socketId).emit("redirectToDashboard", {
              message: "Chat completed - redirecting to dashboard",
              interactionId: interactionId,
              customerId: customerId
            });

            // Reset employee status to free
            activeEmployees.set(employeeId, {
              ...emp,
              status: "free",
              currentCustomer: null
            });
          }

          // Clean up active interactions
          activeInteractions.delete(customerId);
          
          // Broadcast updated free employees count
          broadcastFreeEmployees();

          console.log(`✅ Interaction ${interactionId} completed successfully`);
        } else {
          console.log("❌ Interaction not found for customer:", customerId);
        }
      } catch (error) {
        console.error("❌ Error completing interaction:", error);
        
        // Notify both parties about the error
        const customerSocket = activeCustomers.get(customerId);
        if (customerSocket) {
          io.to(customerSocket).emit("interactionError", {
            message: "Failed to complete interaction"
          });
        }

        const emp = activeEmployees.get(employeeId);
        if (emp && emp.socketId) {
          io.to(emp.socketId).emit("interactionError", {
            message: "Failed to complete interaction"
          });
        }
      }
    });

    // ---------- FORCE COMPLETE INTERACTION (Admin/Timeout) ----------
    socket.on("forceCompleteInteraction", async ({ customerId, reason = "System forced completion" }) => {
      try {
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
      // Handle employee disconnect
      for (const [employeeId, data] of activeEmployees.entries()) {
        if (data.socketId === socket.id) {
          // If employee was in an active interaction, complete it
          if (data.status === "busy" && data.currentCustomer) {
            const customerId = data.currentCustomer;
            socket.broadcast.emit("forceCompleteInteraction", { 
              customerId, 
              reason: "Employee disconnected" 
            });
          }
          activeEmployees.delete(employeeId);
        }
      }

      // Handle customer disconnect
      for (const [customerId, sId] of activeCustomers.entries()) {
        if (sId === socket.id) {
          // If customer was in an active interaction, complete it
          const interactionId = activeInteractions.get(customerId);
          if (interactionId) {
            socket.broadcast.emit("forceCompleteInteraction", { 
              customerId, 
              reason: "Customer disconnected" 
            });
          }
          activeCustomers.delete(customerId);
        }
      }

      broadcastFreeEmployees();
      console.log("🔴 Connection disconnected:", socket.id);
    });
  });
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