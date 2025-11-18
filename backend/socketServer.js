// backend/socketServer.js
import { Server } from "socket.io";
import express from "express";
import Interaction from "./models/Interaction.js";

// Export these Maps so they can be accessed from other files
export const activeCustomers = new Map();
export const activeEmployees = new Map();
export const activeInteractions = new Map();

// Express router for ML dataset endpoint
export const router = express.Router();

export const setupSocketServer = (server) => {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["polling", "websocket"],
  });

  io.on("connection", (socket) => {
    console.log("🟢 New connection:", socket.id);

    // ---------- REGISTER ----------
    socket.on("registerCustomer", (customerId) => {
      activeCustomers.set(customerId, socket.id);
      console.log(`📝 Customer registered: ${customerId} -> ${socket.id}`);
    });

    socket.on("registerEmployee", (employeeId) => {
      activeEmployees.set(employeeId, { 
        socketId: socket.id, 
        status: "free", 
        currentCustomer: null 
      });
      console.log(`👨‍💼 Employee registered: ${employeeId} -> ${socket.id}`);
    });

    // ---------- START INTERACTION ----------
    socket.on("startInteraction", async ({ customerId, type }) => {
      console.log(`🎯 Customer ${customerId} starting ${type} interaction`);
      
      // Check if customer already has a pending interaction
      const existingInteractionId = activeInteractions.get(customerId);
      if (existingInteractionId) {
        console.log(`ℹ️ Customer ${customerId} already has an active interaction`);
        
        // Check if the assigned employee is still available
        const existingInteraction = await Interaction.findById(existingInteractionId);
        if (existingInteraction && existingInteraction.employeeId) {
          const assignedEmployee = activeEmployees.get(existingInteraction.employeeId);
          if (assignedEmployee && assignedEmployee.status === "waiting") {
            // Employee is still waiting - don't create new interaction
            console.log(`🔄 Customer ${customerId} already assigned to employee ${existingInteraction.employeeId}`);
            return;
          }
        }
      }

      const freeEmployee = [...activeEmployees.entries()].find(([, data]) => data.status === "free");

      if (!freeEmployee) {
        console.log(`❌ No free employees for customer ${customerId}`);
        io.to(socket.id).emit("noEmployee", "No free employee available");
        return;
      }

      const [employeeId, empData] = freeEmployee;
      console.log(`🎯 Assigning customer ${customerId} to employee ${employeeId}`);

      // Update existing interaction or create new one
      let interaction;
      if (existingInteractionId) {
        // Update existing interaction with new employee
        interaction = await Interaction.findByIdAndUpdate(
          existingInteractionId,
          { 
            employeeId,
            status: "pending",
            $set: { messages: [] } // Clear previous messages if any
          },
          { new: true }
        );
        console.log(`🔄 Updated existing interaction for customer ${customerId}`);
      } else {
        // Create new Interaction document
        interaction = new Interaction({
          customerId,
          employeeId,
          type,
          messages: [],
          status: "pending",
        });
        await interaction.save();
        console.log(`💾 New interaction saved for customer ${customerId}`);
      }

      // Send request to the first available employee
      io.to(empData.socketId).emit("incomingRequest", { 
        customerId, 
        type,
        redirected: !!existingInteractionId // Indicate if this is a redirected request
      });

      // Update employee status to "waiting"
      activeEmployees.set(employeeId, { 
        ...empData, 
        status: "waiting", 
        currentCustomer: customerId 
      });
      
      activeInteractions.set(customerId, interaction._id);
      
      console.log(`📊 Updated employee ${employeeId} status: waiting`);
    });

    // ---------- ACCEPT INTERACTION ----------
    socket.on("acceptInteraction", async ({ employeeId, customerId }) => {
      console.log(`✅ Employee ${employeeId} accepting chat with customer ${customerId}`);
      
      const emp = activeEmployees.get(employeeId);
      if (emp) {
        emp.status = "busy";
        console.log(`📊 Updated employee ${employeeId} status: busy`);
      }

      const interactionId = activeInteractions.get(customerId);
      if (interactionId) {
        await Interaction.findByIdAndUpdate(interactionId, { status: "active" });
        console.log(`📝 Updated interaction ${interactionId} status: active`);
      }

      const customerSocket = activeCustomers.get(customerId);
      if (customerSocket) {
        io.to(customerSocket).emit("interactionAccepted", { employeeId });
        console.log(`🔔 Notified customer ${customerId} of acceptance`);
      }
    });

    // ✅ FIXED: REJECT INTERACTION - PROPERLY REDIRECTS TO NEXT EMPLOYEE
    socket.on("rejectInteraction", async ({ employeeId, customerId }) => {
      console.log(`❌ Employee ${employeeId} rejecting chat with customer ${customerId}`);
      
      // Reset the rejecting employee's status
      const rejectingEmp = activeEmployees.get(employeeId);
      if (rejectingEmp) {
        rejectingEmp.status = "free";
        rejectingEmp.currentCustomer = null;
        console.log(`📊 Reset employee ${employeeId} status: free`);
      }

      // ✅ FIX: Update the interaction document to remove the assigned employee
      const interactionId = activeInteractions.get(customerId);
      if (interactionId) {
        try {
          await Interaction.findByIdAndUpdate(interactionId, { 
            employeeId: null, // Remove the assigned employee
            status: "pending" // Reset status to pending
          });
          console.log(`📝 Reset interaction ${interactionId} - removed employee assignment`);
        } catch (error) {
          console.error("❌ Error updating interaction:", error);
        }
      }

      // Find the NEXT available employee (excluding the one who just rejected)
      const availableEmployees = [...activeEmployees.entries()].filter(([id, data]) => 
        data.status === "free" && id !== employeeId
      );

      console.log(`🔍 Looking for next available employee. Found: ${availableEmployees.length} options`);

      if (availableEmployees.length > 0) {
        // Get the first available employee
        const [nextEmployeeId, nextEmpData] = availableEmployees[0];
        
        console.log(`🔄 Redirecting customer ${customerId} to employee ${nextEmployeeId}`);
        
        // Update the new employee's status
        activeEmployees.set(nextEmployeeId, {
          ...nextEmpData,
          status: "waiting",
          currentCustomer: customerId
        });

        // ✅ FIX: Update the interaction with the new employee ID
        if (interactionId) {
          await Interaction.findByIdAndUpdate(interactionId, {
            employeeId: nextEmployeeId
          });
        }

        // Send the request to the new employee
        io.to(nextEmpData.socketId).emit("incomingRequest", { 
          customerId, 
          type: "chat",
          redirected: true // Add flag to indicate this is a redirected request
        });

        console.log(`📨 Sent redirected request to employee ${nextEmployeeId}`);
      } else {
        // No employees available - notify customer
        console.log(`😞 No other employees available for customer ${customerId}`);
        const customerSocket = activeCustomers.get(customerId);
        if (customerSocket) {
          io.to(customerSocket).emit("noEmployee", "All employees are currently busy. Please try again later.");
        }
        
        // Clean up the interaction since no one can handle it
        if (interactionId) {
          await Interaction.findByIdAndUpdate(interactionId, { 
            status: "rejected",
            endTime: new Date()
          });
          activeInteractions.delete(customerId);
        }
      }
    });

    // ---------- SEND MESSAGE ----------
    socket.on("sendMessage", async ({ sender, receiverId, text, role, customerId }) => {
      console.log(`💬 ${sender} sending message to ${receiverId}: ${text.substring(0, 50)}...`);
      
      let receiverSocket;
      
      if (role === "customer") {
        // Sending to employee - get employee's socket ID
        const employeeData = activeEmployees.get(receiverId);
        receiverSocket = employeeData?.socketId;
      } else {
        // Sending to customer - get customer's socket ID directly
        receiverSocket = activeCustomers.get(receiverId);
      }

      if (receiverSocket) {
        io.to(receiverSocket).emit("receiveMessage", { sender, text });
        console.log(`📤 Message delivered to ${receiverId}`);
      } else {
        console.log(`❌ Could not find receiver ${receiverId}`);
      }

      // Save message to database
      const interactionId = activeInteractions.get(customerId);
      if (interactionId) {
        const length = text.length;
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

        try {
          await Interaction.findByIdAndUpdate(interactionId, {
            $push: {
              messages: { 
                sender, 
                text, 
                timestamp: new Date(), 
                length, 
                wordCount 
              },
            },
          });
          console.log(`💾 Message saved to interaction ${interactionId}`);
        } catch (error) {
          console.error("❌ Error saving message:", error);
        }
      }
    });

    // ✅ NEW: COMPLETE INTERACTION - FREES EMPLOYEE
    socket.on("completeInteraction", async ({ customerId, employeeId }) => {
      console.log(`🏁 Completing interaction for customer ${customerId} with employee ${employeeId}`);
      
      // Free the employee
      const emp = activeEmployees.get(employeeId);
      if (emp) {
        emp.status = "free";
        emp.currentCustomer = null;
        console.log(`📊 Freed employee ${employeeId} - status: free`);
        
        // Notify employee that chat is completed
        io.to(emp.socketId).emit("interactionCompleted", { customerId });
      }

      // Update interaction status
      const interactionId = activeInteractions.get(customerId);
      if (interactionId) {
        try {
          await Interaction.findByIdAndUpdate(interactionId, { 
            status: "completed",
            endTime: new Date()
          });
          console.log(`📝 Marked interaction ${interactionId} as completed`);
        } catch (error) {
          console.error("❌ Error updating interaction status:", error);
        }
        
        // Clean up
        activeInteractions.delete(customerId);
      }

      // Notify customer
      const customerSocket = activeCustomers.get(customerId);
      if (customerSocket) {
        io.to(customerSocket).emit("interactionEnded", { 
          message: "Chat session completed successfully" 
        });
      }

      console.log(`✅ Interaction completed for customer ${customerId}`);
    });

    // ✅ NEW: CUSTOMER COMPLETE CHAT ENDPOINT
    socket.on("customerCompleteChat", async ({ customerId }) => {
      console.log(`🏁 Customer ${customerId} requesting to complete chat`);
      
      const interactionId = activeInteractions.get(customerId);
      if (!interactionId) {
        console.log(`❌ No active interaction found for customer ${customerId}`);
        return;
      }

      try {
        const interaction = await Interaction.findById(interactionId);
        if (!interaction || !interaction.employeeId) {
          console.log(`❌ No employee assigned to interaction ${interactionId}`);
          return;
        }

        const employeeId = interaction.employeeId;
        
        // Free the employee
        const emp = activeEmployees.get(employeeId);
        if (emp) {
          emp.status = "free";
          emp.currentCustomer = null;
          console.log(`📊 Freed employee ${employeeId} - status: free`);
          
          // Notify employee that chat is completed by customer
          io.to(emp.socketId).emit("interactionCompleted", { 
            customerId,
            completedBy: "customer" 
          });
        }

        // Update interaction status
        await Interaction.findByIdAndUpdate(interactionId, { 
          status: "completed",
          endTime: new Date(),
          completedBy: "customer"
        });
        console.log(`📝 Marked interaction ${interactionId} as completed by customer`);

        // Clean up
        activeInteractions.delete(customerId);

        // Notify customer
        const customerSocket = activeCustomers.get(customerId);
        if (customerSocket) {
          io.to(customerSocket).emit("interactionEnded", { 
            message: "Chat session completed successfully" 
          });
        }

        console.log(`✅ Chat completed by customer ${customerId}, employee ${employeeId} freed`);
      } catch (error) {
        console.error("❌ Error completing chat:", error);
      }
    });

    // ---------- DISCONNECT ----------
    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);
      
      // Clean up employees
      for (const [id, data] of activeEmployees.entries()) {
        if (data.socketId === socket.id) {
          // If employee was busy with a customer, free that customer
          if (data.currentCustomer) {
            const customerSocket = activeCustomers.get(data.currentCustomer);
            if (customerSocket) {
              io.to(customerSocket).emit("employeeDisconnected", {
                message: "Employee disconnected. Please start a new chat."
              });
            }
            // Clean up the interaction
            activeInteractions.delete(data.currentCustomer);
          }
          
          activeEmployees.delete(id);
          console.log(`🧹 Removed employee ${id} from active list`);
        }
      }
      
      // Clean up customers
      for (const [id, sId] of activeCustomers.entries()) {
        if (sId === socket.id) {
          // If customer was in an active chat, free the employee
          const interactionId = activeInteractions.get(id);
          if (interactionId) {
            try {
              Interaction.findById(interactionId).then(interaction => {
                if (interaction && interaction.employeeId) {
                  const emp = activeEmployees.get(interaction.employeeId);
                  if (emp) {
                    emp.status = "free";
                    emp.currentCustomer = null;
                    console.log(`📊 Freed employee ${interaction.employeeId} due to customer disconnect`);
                  }
                }
              });
            } catch (error) {
              console.error("Error handling customer disconnect:", error);
            }
            activeInteractions.delete(id);
          }
          
          activeCustomers.delete(id);
          console.log(`🧹 Removed customer ${id} from active list`);
        }
      }
    });

    // ---------- DEBUG ENDPOINT ----------
    socket.on("getStatus", () => {
      const status = {
        activeCustomers: Array.from(activeCustomers.entries()),
        activeEmployees: Array.from(activeEmployees.entries()),
        activeInteractions: Array.from(activeInteractions.entries())
      };
      socket.emit("statusUpdate", status);
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