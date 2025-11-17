import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function ChatEmployee() {
  const [employeeId] = useState("6910a4bbffb46343c6ce9d20");
  const [customerId, setCustomerId] = useState(null);
  const [chat, setChat] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Initializing...");
  const [socketStatus, setSocketStatus] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    console.log("🚀 Initializing employee chat with ID:", employeeId);
    
    const socket = io("https://cies-5dc4.onrender.com", {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Employee socket connected:", socket.id);
      console.log("📝 Registering employee with ID:", employeeId);
      
      socket.emit("registerEmployee", employeeId);
      setStatus("✅ Registered and waiting for customers...");
      checkSocketStatus();
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

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connect_error:", err);
      setStatus("Connection error: " + err.message);
    });
    
    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
      setStatus("Disconnected from server");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [employeeId]);

  const checkSocketStatus = async () => {
    try {
      const response = await fetch("https://cies-5dc4.onrender.com/api/debug/socket-status");
      const data = await response.json();
      setSocketStatus(data);
      console.log("📊 Current socket status:", data);
    } catch (error) {
      console.error("Error checking socket status:", error);
    }
  };

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

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Employee Chat Dashboard</h1>
      
      {/* Debug Info */}
      <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
        <p className="text-sm"><strong>Employee ID:</strong> {employeeId}</p>
        <p className="text-sm"><strong>Status:</strong> {status}</p>
        <p className="text-sm"><strong>Current Customer:</strong> {customerId || "None"}</p>
        
        {/* Socket Status Summary */}
        {socketStatus.summary && (
          <div className="mt-2 p-2 bg-zinc-700 rounded">
            <p className="text-xs font-semibold">System Status:</p>
            <p className="text-xs">Free Employees: {socketStatus.summary.freeEmployees}</p>
            <p className="text-xs">Total Customers: {socketStatus.summary.totalCustomers}</p>
          </div>
        )}
        
        <button 
          onClick={checkSocketStatus}
          className="mt-2 bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500"
        >
          Refresh Status
        </button>
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
          <p className="text-gray-500 text-center py-8">No messages yet. Waiting for customer...</p>
        ) : (
          chat.map((msg, i) => (
            <div key={i} className={`mb-3 p-2 rounded-lg ${msg.sender === "You" ? "bg-green-900 text-green-100 text-right" : msg.sender === "System" ? "bg-gray-700 text-gray-300 text-center" : "bg-blue-900 text-blue-100"}`}>
              <span className="font-semibold">{msg.sender}:</span> {msg.text}
            </div>
          ))
        )}
      </div>

      {/* Message Input */}
      {customerId && (
        <div className="flex space-x-2">
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
    </div>
  );
}