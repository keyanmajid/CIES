// backend/socketServer.js - FIXED VERSION

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
      
      const freeEmployee = [...activeEmployees.entries()].find(([, data]) => data.status === "free");

      if (!freeEmployee) {
        console.log(`❌ No free employees for customer ${customerId}`);
        io.to(socket.id).emit("noEmployee", "No free employee available");
        return;
      }

      const [employeeId, empData] = freeEmployee;
      console.log(`🎯 Assigning customer ${customerId} to employee ${employeeId}`);

      // Send request to the first available employee
      io.to(empData.socketId).emit("incomingRequest", { customerId, type });

      // Create new Interaction document
      const interaction = new Interaction({
        customerId,
        employeeId,
        type,
        messages: [],
        status: "pending",
      });

      try {
        await interaction.save();
        console.log(`💾 Interaction saved for customer ${customerId}`);
      } catch (error) {
        console.error("❌ Interaction Save Error:", error);
        io.to(socket.id).emit("interactionError", "Failed to start interaction due to database error.");
        return;
      }

      // Update employee status to "waiting" (not "busy" yet - they haven't accepted)
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

        // Send the request to the new employee
        io.to(nextEmpData.socketId).emit("incomingRequest", { 
          customerId, 
          type: "chat",
          message: "Chat request redirected from another employee"
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
        const interactionId = activeInteractions.get(customerId);
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

    // ---------- DISCONNECT ----------
    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);
      
      // Clean up employees
      for (const [id, data] of activeEmployees.entries()) {
        if (data.socketId === socket.id) {
          activeEmployees.delete(id);
          console.log(`🧹 Removed employee ${id} from active list`);
        }
      }
      
      // Clean up customers
      for (const [id, sId] of activeCustomers.entries()) {
        if (sId === socket.id) {
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