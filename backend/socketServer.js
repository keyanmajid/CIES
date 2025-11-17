// backend/socketServer.js
import { Server } from "socket.io";
import express from "express"; // ✅ needed for router
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
    socket.on("registerCustomer", (customerId) => activeCustomers.set(customerId, socket.id));
    socket.on("registerEmployee", (employeeId) => {
      activeEmployees.set(employeeId, { socketId: socket.id, status: "free", currentCustomer: null });
    });

    // ---------- START INTERACTION ----------
    socket.on("startInteraction", async ({ customerId, type }) => {
      const freeEmployee = [...activeEmployees.entries()].find(([, data]) => data.status === "free");

      if (!freeEmployee) {
        io.to(socket.id).emit("noEmployee", "No free employee available");
        return;
      }

      const [employeeId, empData] = freeEmployee;
      console.log(`[START INTERACTION] Targeting Employee ID: ${employeeId}`);

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
      } catch (error) {
        console.error("❌ Interaction Save Error:", error);
        io.to(socket.id).emit("interactionError", "Failed to start interaction due to database error.");
        return;
      }

      activeInteractions.set(customerId, interaction._id);
      activeEmployees.set(employeeId, { ...empData, status: "waiting", currentCustomer: customerId });
    });

    // ---------- ACCEPT INTERACTION ----------
    socket.on("acceptInteraction", async ({ employeeId, customerId }) => {
      const emp = activeEmployees.get(employeeId);
      if (emp) emp.status = "busy";

      const interactionId = activeInteractions.get(customerId);
      if (interactionId) {
        await Interaction.findByIdAndUpdate(interactionId, { status: "active" });
      }

      const customerSocket = activeCustomers.get(customerId);
      if (customerSocket) io.to(customerSocket).emit("interactionAccepted", { employeeId });
    });

    // ---------- REJECT INTERACTION ----------
    socket.on("rejectInteraction", async ({ employeeId, customerId }) => {
      const emp = activeEmployees.get(employeeId);
      if (emp) emp.status = "free";

      const nextFree = [...activeEmployees.entries()].find(([id, data]) => data.status === "free" && id !== employeeId);

      if (nextFree) {
        const [nextId, nextData] = nextFree;
        activeEmployees.set(nextId, { ...nextData, status: "waiting", currentCustomer: customerId });
        io.to(nextData.socketId).emit("incomingRequest", { customerId, message: "Redirected request" });
      } else {
        const customerSocket = activeCustomers.get(customerId);
        if (customerSocket) io.to(customerSocket).emit("noEmployee", "No free employee available");
      }
    });

    // ---------- SEND MESSAGE ----------
    socket.on("sendMessage", async ({ sender, receiverId, text, role, customerId }) => {
      const receiverSocket = role === "customer" ? activeEmployees.get(receiverId)?.socketId : activeCustomers.get(receiverId);

      if (receiverSocket) io.to(receiverSocket).emit("receiveMessage", { sender, text });

      // Save message and ML features
      const interactionId = activeInteractions.get(customerId);
      if (interactionId) {
        const length = text.length;
        const wordCount = text.split(" ").length;

        await Interaction.findByIdAndUpdate(interactionId, {
          $push: {
            messages: { sender, text, timestamp: new Date(), length, wordCount },
          },
        });
      }
    });

    // ---------- DISCONNECT ----------
    socket.on("disconnect", () => {
      for (const [id, data] of activeEmployees.entries()) {
        if (data.socketId === socket.id) activeEmployees.delete(id);
      }
      for (const [id, sId] of activeCustomers.entries()) {
        if (sId === socket.id) activeCustomers.delete(id);
      }
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
