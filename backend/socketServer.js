// backend/socketServer.js
import { Server } from "socket.io";
import express from "express";
import Interaction from "./models/Interaction.js"; // Assuming this path is correct

// Export these Maps so they can be accessed from other files
export const activeCustomers = new Map();
export const activeEmployees = new Map();
export const activeInteractions = new Map();

// Express router for ML dataset endpoint
export const router = express.Router();

/**
 * Utility function to find the next available employee excluding a specific one.
 * @param {string | null} excludeEmployeeId - ID of employee to skip (e.g., the one who just rejected the request).
 * @returns {Array | null} [employeeId, employeeData] of the first free employee found.
 */
function findNextAvailableEmployee(excludeEmployeeId = null) {
    const freeEmployees = [...activeEmployees.entries()].filter(([id, data]) => 
        data.status === "free" && id !== excludeEmployeeId
    );
    return freeEmployees.length > 0 ? freeEmployees[0] : null;
}

/**
 * Attempts to re-route a pending interaction to an available employee.
 * @param {object} io - The Socket.IO server instance.
 * @param {string} customerId - The customer ID for the pending interaction.
 * @param {string} interactionId - The ID of the Interaction document.
 * @param {string} [excludeEmployeeId=null] - Employee ID to exclude from assignment.
 */
async function routePendingInteraction(io, customerId, interactionId, excludeEmployeeId = null) {
    console.log(`[ROUTE] Attempting to route interaction ${interactionId} (Customer: ${customerId})`);
    
    // Find the NEXT available employee
    const nextEmployeeEntry = findNextAvailableEmployee(excludeEmployeeId);

    if (nextEmployeeEntry) {
        const [nextEmployeeId, nextEmpData] = nextEmployeeEntry;
        
        console.log(`[ROUTE] Assigning to employee ${nextEmployeeId}`);
        
        // Update the new employee's status
        activeEmployees.set(nextEmployeeId, {
            ...nextEmpData,
            status: "waiting", // Employee is waiting for customer response
            currentCustomer: customerId
        });

        // Update the interaction with the new employee ID
        await Interaction.findByIdAndUpdate(interactionId, {
            employeeId: nextEmployeeId,
            status: "pending" // Ensure status is pending
        });

        // Get interaction type (needed for the incomingRequest event)
        const interaction = await Interaction.findById(interactionId);
        
        // Send the request to the new employee
        io.to(nextEmpData.socketId).emit("incomingRequest", { 
            customerId, 
            type: interaction?.type || "chat",
            redirected: true
        });

        console.log(`[ROUTE] Sent redirected request to employee ${nextEmployeeId}`);
        return true;
    } else {
        // No employees available - clean up and notify customer
        console.log(`[ROUTE] 😞 No free employees available for customer ${customerId}.`);
        
        const customerSocketId = activeCustomers.get(customerId);
        if (customerSocketId) {
            io.to(customerSocketId).emit("noEmployee", "All employees are currently busy. Please try again later.");
        }
        
        // Final clean up and status update for the abandoned interaction
        await Interaction.findByIdAndUpdate(interactionId, { 
            status: "no_agent", // New status for failed assignment
            endTime: new Date()
        });
        activeInteractions.delete(customerId);
        return false;
    }
}


export const setupSocketServer = (server) => {
    const io = new Server(server, {
        cors: { 
            origin: [
                "https://customerinteractioneval.netlify.app",
                "http://localhost:3000",
                "http://localhost:5173",
                "https://cies-5dc4.onrender.com"
            ], 
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ["websocket", "polling"],
        // FIX: Added explicit ping settings for stability (Disconnection issue)
        pingInterval: 25000, 
        pingTimeout: 15000,
        cookie: false // Prevents issues if sticky sessions aren't configured correctly
    });

    io.on("connection", (socket) => {
        console.log("🟢 New connection:", socket.id);
        console.log("📊 Current stats - Employees:", activeEmployees.size, "Customers:", activeCustomers.size);

        // ---------- REGISTER ----------
        socket.on("registerCustomer", (customerId) => {
            activeCustomers.set(customerId, socket.id);
            console.log(`📝 Customer registered: ${customerId} -> ${socket.id}`);
            console.log(`📊 Total customers: ${activeCustomers.size}`);
        });

        socket.on("registerEmployee", (employeeId) => {
            let employeeData = activeEmployees.get(employeeId);

            if (employeeData) {
                // FIX: Check if the employee was handling a customer and re-route if disconnected
                if (employeeData.currentCustomer) {
                    // This scenario is better handled by the disconnect logic, but good for a double-check on re-connect
                    console.warn(`⚠️ Employee ${employeeId} reconnected while marked as handling customer ${employeeData.currentCustomer}. Forcing status update.`);
                }
                
                // Update existing employee with new socket ID and reset status to free/re-available
                activeEmployees.set(employeeId, {
                    ...employeeData,
                    socketId: socket.id,
                    status: "free", // Assume free upon re-registration until proven otherwise
                    currentCustomer: null
                });
                console.log(`🔄 Employee reconnected: ${employeeId} -> ${socket.id}`);
            } else {
                // Create new employee entry
                activeEmployees.set(employeeId, { 
                    socketId: socket.id, 
                    status: "free", 
                    currentCustomer: null 
                });
                console.log(`👨‍💼 New employee registered: ${employeeId} -> ${socket.id}`);
            }
            
            console.log(`📊 Total employees: ${activeEmployees.size}, Free: ${[...activeEmployees.values()].filter(emp => emp.status === "free").length}`);
            
            // Send confirmation to employee
            socket.emit("employeeRegistered", { 
                success: true, 
                employeeId,
                freeEmployees: [...activeEmployees.values()].filter(emp => emp.status === "free").length
            });
        });

        // ---------- START INTERACTION ----------
        socket.on("startInteraction", async ({ customerId, type }) => {
            console.log(`🎯 Customer ${customerId} starting ${type} interaction`);
            
            // Check if customer already has a pending interaction ID
            let interactionId = activeInteractions.get(customerId);
            let interaction;

            if (interactionId) {
                interaction = await Interaction.findById(interactionId);
                // If interaction is active, do nothing
                if (interaction && interaction.status === "active") {
                    console.log(`ℹ️ Customer ${customerId} already in active chat.`);
                    return;
                }
                
                // If interaction is pending, check if the employee is still waiting.
                if (interaction && interaction.status === "pending" && interaction.employeeId) {
                    const assignedEmployee = activeEmployees.get(interaction.employeeId);
                    if (assignedEmployee && assignedEmployee.status === "waiting") {
                        console.log(`🔄 Customer ${customerId} request already sent to employee ${interaction.employeeId}. Waiting for response.`);
                        return;
                    }
                }
                
                // If the check above fails (employee disconnected or not waiting), we'll try to route it below.
            }

            const freeEmployees = findNextAvailableEmployee();
            
            if (!freeEmployees) {
                console.log(`❌ No free employees for customer ${customerId}`);
                io.to(socket.id).emit("noEmployee", "No free employee available");
                return;
            }

            // Get the first free employee
            const [employeeId, empData] = freeEmployees;
            console.log(`🎯 Assigning customer ${customerId} to employee ${employeeId}`);

            // Update existing interaction or create new one
            if (interactionId) {
                // Update existing interaction with new employee (Re-route attempt)
                interaction = await Interaction.findByIdAndUpdate(
                    interactionId,
                    { 
                        employeeId,
                        status: "pending",
                        $set: { messages: [] } // Clear previous messages if needed
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
                interactionId = interaction._id;
                activeInteractions.set(customerId, interactionId);
                console.log(`💾 New interaction saved for customer ${customerId}`);
            }

            // Send request to the first available employee
            io.to(empData.socketId).emit("incomingRequest", { 
                customerId, 
                type,
                redirected: !!interactionId
            });

            console.log(`📨 Sent request to employee ${employeeId} at socket ${empData.socketId}`);

            // Update employee status to "waiting"
            activeEmployees.set(employeeId, { 
                ...empData, 
                status: "waiting", 
                currentCustomer: customerId 
            });
            
            console.log(`📊 Updated employee ${employeeId} status: waiting`);
        });

        // ---------- ACCEPT INTERACTION ----------
        socket.on("acceptInteraction", async ({ employeeId, customerId }) => {
            console.log(`✅ Employee ${employeeId} accepting chat with customer ${customerId}`);
            
            const emp = activeEmployees.get(employeeId);
            const interactionId = activeInteractions.get(customerId);

            // Update employee status
            if (emp) {
                emp.status = "busy";
                console.log(`📊 Updated employee ${employeeId} status: busy`);
            }

            // Update interaction status
            if (interactionId) {
                await Interaction.findByIdAndUpdate(interactionId, { status: "active" });
                console.log(`📝 Updated interaction ${interactionId} status: active`);
            }

            // Notify customer
            const customerSocket = activeCustomers.get(customerId);
            if (customerSocket) {
                io.to(customerSocket).emit("interactionAccepted", { employeeId });
                console.log(`🔔 Notified customer ${customerId} of acceptance`);
            } else {
                console.log(`❌ Customer ${customerId} not found for acceptance notification`);
            }
        });

        // ---------- REJECT INTERACTION (FIXED: PROPERLY REDIRECTS TO NEXT EMPLOYEE) ----------
        socket.on("rejectInteraction", async ({ employeeId, customerId }) => {
            console.log(`❌ Employee ${employeeId} rejecting chat with customer ${customerId}`);
            
            // 1. Reset the rejecting employee's status
            const rejectingEmp = activeEmployees.get(employeeId);
            if (rejectingEmp) {
                rejectingEmp.status = "free";
                rejectingEmp.currentCustomer = null;
                console.log(`📊 Reset employee ${employeeId} status: free`);
            }

            // 2. Clear the employeeId from the interaction document
            const interactionId = activeInteractions.get(customerId);
            if (!interactionId) return;
            
            await Interaction.findByIdAndUpdate(interactionId, { 
                employeeId: null,
                status: "pending"
            });
            console.log(`📝 Reset interaction ${interactionId} - removed employee assignment`);

            // 3. Attempt to route to the next available employee
            await routePendingInteraction(io, customerId, interactionId, employeeId);
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

        // ---------- COMPLETE INTERACTION (Employee) ----------
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
                        endTime: new Date(),
                        completedBy: "employee" // Added completedBy field
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

        // ---------- COMPLETE CHAT (Customer) ----------
        socket.on("customerCompleteChat", async ({ customerId }) => {
            console.log(`🏁 Customer ${customerId} requesting to complete chat`);
            
            const interactionId = activeInteractions.get(customerId);
            if (!interactionId) return;

            try {
                const interaction = await Interaction.findById(interactionId);
                const employeeId = interaction?.employeeId;
                
                if (employeeId) {
                    // Free the employee
                    const emp = activeEmployees.get(employeeId);
                    if (emp) {
                        emp.status = "free";
                        emp.currentCustomer = null;
                        
                        // Notify employee that chat is completed by customer
                        io.to(emp.socketId).emit("interactionCompleted", { 
                            customerId,
                            completedBy: "customer" 
                        });
                    }
                }

                // Update interaction status
                await Interaction.findByIdAndUpdate(interactionId, { 
                    status: "completed",
                    endTime: new Date(),
                    completedBy: "customer"
                });
                
                // Clean up
                activeInteractions.delete(customerId);

                // Notify customer
                const customerSocket = activeCustomers.get(customerId);
                if (customerSocket) {
                    io.to(customerSocket).emit("interactionEnded", { 
                        message: "Chat session completed successfully" 
                    });
                }
            } catch (error) {
                console.error("❌ Error completing chat:", error);
            }
        });

        // ---------- DISCONNECT (FIXED: ROBUST CLEANUP) ----------
        socket.on("disconnect", async (reason) => {
            console.log(`🔴 Socket disconnected: ${socket.id}, reason: ${reason}`);
            
            // 1. Clean up employees
            let disconnectedEmployeeId = null;
            for (const [id, data] of activeEmployees.entries()) {
                if (data.socketId === socket.id) {
                    disconnectedEmployeeId = id;
                    console.log(`🧹 Employee ${id} disconnected. Status: ${data.status}`);

                    // If employee was busy/waiting, handle the abandoned customer
                    if (data.currentCustomer) {
                        const customerId = data.currentCustomer;
                        const interactionId = activeInteractions.get(customerId);

                        if (interactionId) {
                            // Attempt to re-route the customer to a new agent
                            const successfullyRouted = await routePendingInteraction(io, customerId, interactionId, id);
                            
                            if (!successfullyRouted) {
                                // If re-route fails, notify customer
                                const customerSocket = activeCustomers.get(customerId);
                                if (customerSocket) {
                                    io.to(customerSocket).emit("employeeDisconnected", {
                                        message: "Employee disconnected and no other agent is available. Please start a new chat later."
                                    });
                                }
                            }
                        }
                    }
                    
                    activeEmployees.delete(id);
                    console.log(`✅ Removed employee ${id} from active list`);
                    break; 
                }
            }
            
            // 2. Clean up customers
            for (const [id, sId] of activeCustomers.entries()) {
                if (sId === socket.id) {
                    console.log(`🧹 Removing customer ${id} due to disconnect`);
                    
                    const interactionId = activeInteractions.get(id);
                    if (interactionId) {
                        try {
                            const interaction = await Interaction.findById(interactionId);
                            if (interaction && interaction.employeeId) {
                                // Free the employee who was chatting with this customer
                                const emp = activeEmployees.get(interaction.employeeId);
                                if (emp) {
                                    emp.status = "free";
                                    emp.currentCustomer = null;
                                    console.log(`📊 Freed employee ${interaction.employeeId} due to customer disconnect`);
                                    io.to(emp.socketId).emit("interactionCompleted", { customerId: id });
                                }
                            }
                        } catch (error) {
                            console.error("Error handling customer disconnect cleanup:", error);
                        }
                        activeInteractions.delete(id);
                    }
                    
                    activeCustomers.delete(id);
                    console.log(`✅ Removed customer ${id} from active list`);
                    break;
                }
            }
            
            console.log(`📊 Final stats - Employees: ${activeEmployees.size}, Customers: ${activeCustomers.size}`);
        });

        // ---------- DEBUG ENDPOINT ----------
        socket.on("getStatus", () => {
            const status = {
                activeCustomers: Array.from(activeCustomers.entries()),
                activeEmployees: Array.from(activeEmployees.entries()),
                activeInteractions: Array.from(activeInteractions.entries()),
                summary: {
                    totalEmployees: activeEmployees.size,
                    freeEmployees: [...activeEmployees.values()].filter(emp => emp.status === "free").length,
                    totalCustomers: activeCustomers.size,
                    totalInteractions: activeInteractions.size
                }
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
                timestamp: msg.timestamp, // Added timestamp
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