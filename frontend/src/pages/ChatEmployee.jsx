import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function ChatEmployee() {
  const [employeeId] = useState("6910a4bbffb46343c6ce9d20");
  const [customerId, setCustomerId] = useState(null);
  const [chat, setChat] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Initializing...");
  const socketRef = useRef(null);

  useEffect(() => {
    console.log("🚀 Initializing employee chat with ID:", employeeId);
    
    const socket = io("https://cies-5dc4.onrender.com", {
      transports: ["websocket", "polling"], // Changed order for better connection
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Employee socket connected:", socket.id);
      console.log("📝 Registering employee with ID:", employeeId);
      
      socket.emit("registerEmployee", employeeId);
      setStatus("✅ Registered and waiting for customers...");
    });

    socket.on("incomingRequest", (data) => {
      console.log("📨 INCOMING REQUEST RECEIVED:", data);
      setIncoming({ 
        customerId: data.customerId, 
        type: data.type,
        message: `Customer ${data.customerId} wants to ${data.type}` 
      });
      setStatus("🎯 Incoming chat request! Accept or reject?");
    });

    socket.on("receiveMessage", ({ sender, text }) => {
      console.log("💬 Message received from customer:", text);
      setChat(prev => [...prev, { sender: "Customer", text }]);
    });

    // ✅ NEW: Handle interaction completed
    socket.on("interactionCompleted", ({ customerId, completedBy }) => {
      console.log(`🏁 Interaction completed by ${completedBy || 'system'}`);
      setStatus("Chat completed. Waiting for new requests...");
      setCustomerId(null);
      setChat([]);
      setIncoming(null);
    });

    // ✅ NEW: Handle customer disconnect
    socket.on("customerDisconnected", ({ customerId }) => {
      console.log(`🔴 Customer ${customerId} disconnected`);
      setStatus("Customer disconnected. Waiting for new requests...");
      setCustomerId(null);
      setChat(prev => [...prev, { sender: "System", text: "Customer disconnected from chat" }]);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connect_error:", err);
      setStatus("Connection error: " + err.message);
    });
    
    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
      setStatus("Disconnected from server");
    });

    return () => {
      console.log("🧹 Cleaning up socket connection");
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [employeeId]);

  const acceptChat = () => {
    if (!incoming) return;
    
    console.log("✅ Accepting chat with customer:", incoming.customerId);
    
    socketRef.current.emit("acceptInteraction", { 
      employeeId: employeeId, 
      customerId: incoming.customerId 
    });
    
    setCustomerId(incoming.customerId);
    setIncoming(null);
    setStatus(`💬 Chat active with customer ${incoming.customerId}`);
    setChat(prev => [...prev, { sender: "System", text: "Chat started with customer" }]);
  };

  const rejectChat = () => {
    if (!incoming) return;
    
    console.log("❌ Rejecting chat with customer:", incoming.customerId);
    
    socketRef.current.emit("rejectInteraction", { 
      employeeId: employeeId, 
      customerId: incoming.customerId 
    });
    
    setIncoming(null);
    setStatus("🔄 Rejected chat, waiting for new requests...");
  };

  const sendMessage = () => {
    if (!message.trim() || !customerId) return;
    
    console.log("📤 Sending message to customer:", customerId);
    
    socketRef.current.emit("sendMessage", { 
      sender: "employee", 
      receiverId: customerId, 
      text: message, 
      role: "employee",
      customerId: customerId
    });
    
    setChat(prev => [...prev, { sender: "You", text: message }]);
    setMessage("");
  };

  const completeChat = () => {
    if (!customerId) return;
    
    console.log("🏁 Employee completing chat with customer:", customerId);
    
    socketRef.current.emit("completeInteraction", { 
      customerId: customerId,
      employeeId: employeeId
    });
    
    setStatus("Chat completed. Waiting for new requests...");
    setCustomerId(null);
    setChat([]);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Employee Chat Dashboard</h1>
      
      {/* Connection Status */}
      <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
        <p className="text-sm"><strong>Employee ID:</strong> {employeeId}</p>
        <p className="text-sm"><strong>Status:</strong> {status}</p>
        <p className="text-sm"><strong>Current Customer:</strong> {customerId || "None"}</p>
      </div>

      {/* Incoming Request */}
      {incoming && (
        <div className="bg-yellow-900 border border-yellow-700 p-4 rounded-xl mb-4 animate-pulse">
          <p className="font-semibold text-yellow-300 text-lg">📨 INCOMING CHAT REQUEST!</p>
          <p className="text-gray-300 mt-2">Customer: {incoming.customerId}</p>
          <p className="text-gray-300">Type: {incoming.type}</p>
          <div className="mt-3 flex space-x-2">
            <button 
              onClick={acceptChat} 
              className="bg-green-600 px-6 py-2 rounded-xl hover:bg-green-500 font-semibold flex-1"
            >
              ✅ Accept Chat
            </button>
            <button 
              onClick={rejectChat} 
              className="bg-red-600 px-6 py-2 rounded-xl hover:bg-red-500 font-semibold flex-1"
            >
              ❌ Reject
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="bg-zinc-900 p-4 rounded-2xl flex-1 overflow-y-auto border border-gray-800 mb-4">
        {chat.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {customerId ? "No messages yet. Start chatting with the customer..." : "Waiting for customer requests..."}
          </p>
        ) : (
          chat.map((msg, i) => (
            <div key={i} className={`mb-3 p-3 rounded-lg ${
              msg.sender === "You" 
                ? "bg-green-900 text-green-100 text-right" 
                : msg.sender === "System" 
                ? "bg-gray-700 text-gray-300 text-center" 
                : "bg-blue-900 text-blue-100"
            }`}>
              <span className="font-semibold">{msg.sender}:</span> {msg.text}
            </div>
          ))
        )}
      </div>

      {/* Message Input */}
      {customerId && (
        <div className="flex space-x-2 mb-4">
          <input
            className="flex-1 p-3 bg-zinc-800 rounded-xl border border-gray-700 text-gray-100"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button 
            onClick={sendMessage} 
            className="bg-green-600 px-6 rounded-xl hover:bg-green-500 font-semibold"
          >
            Send
          </button>
        </div>
      )}

      {/* Complete Chat Button */}
      {customerId && (
        <button 
          onClick={completeChat}
          className="bg-purple-600 px-6 py-3 rounded-xl hover:bg-purple-500 font-semibold"
        >
          Complete Chat
        </button>
      )}
    </div>
  );
}