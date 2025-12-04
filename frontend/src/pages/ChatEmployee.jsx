import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom"; // Add this import

export default function ChatEmployee() {
  const [employeeId, setEmployeeId] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [chat, setChat] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Initializing...");
  const [socketStatus, setSocketStatus] = useState({});
  const socketRef = useRef(null);
  const navigate = useNavigate(); // Add navigation hook

  useEffect(() => {
    const getEmployeeData = () => {
      try {
        const userData = localStorage.getItem("user");
        console.log("🔍 Raw userData from localStorage:", userData);
        
        if (userData) {
          const user = JSON.parse(userData);
          console.log("🔍 Parsed user object:", user);
          console.log("🔍 User ID:", user.id);
          console.log("🔍 User role:", user.role);
          
          if (user.id) {
            setEmployeeId(user.id);
            console.log("🆔 Using actual employee ID:", user.id);
          } else {
            console.log("❌ No id found in user data");
            setStatus("Error: No employee ID found");
          }
        } else {
          console.log("❌ No user data found in localStorage");
          setStatus("Error: Please login first");
        }
      } catch (error) {
        console.error("Error getting employee data:", error);
        setStatus("Error: Failed to load employee data");
      }
    };

    getEmployeeData();
  }, []);

  useEffect(() => {
    if (!employeeId) return;

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

    // NEW: Handle redirection to dashboard when chat is completed
    socket.on("redirectToDashboard", (data) => {
      console.log("📊 Redirecting to dashboard:", data);
      setStatus("✅ Chat completed - Redirecting to dashboard...");
      
      // Add a success message to chat before redirecting
      setChat(prev => [...prev, { 
        sender: "System", 
        text: `Chat completed successfully. Redirecting to dashboard...` 
      }]);
      
      // Redirect after a short delay to show the message
      setTimeout(() => {
        navigate("/employee-dashboard"); // Redirect to employee dashboard
      }, 2000);
    });

    // NEW: Handle interaction completion notifications
    socket.on("interactionCompleted", (data) => {
      console.log("✅ Interaction completed notification:", data);
      setStatus("Chat completed by customer");
      setChat(prev => [...prev, { 
        sender: "System", 
        text: "Customer has ended the chat. You will be redirected shortly..." 
      }]);
    });

    // NEW: Handle force completion (timeouts, disconnections, etc.)
    socket.on("forceCompleteInteraction", (data) => {
      console.log("🔧 Force completion:", data);
      setStatus(`Chat ended: ${data.reason}`);
      setChat(prev => [...prev, { 
        sender: "System", 
        text: `Chat ended: ${data.reason}. Redirecting...` 
      }]);
      
      setTimeout(() => {
        navigate("/employee-dashboard");
      }, 2000);
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
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [employeeId, navigate]); // Add navigate to dependencies

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
    socketRef.current.emit("acceptInteraction", { employeeId, customerId: incoming.customerId });
    setCustomerId(incoming.customerId);
    setIncoming(null);
    setStatus(`💬 Chat active with customer ${incoming.customerId}`);
    setChat(prev => [...prev, { sender: "System", text: "Chat started with customer" }]);
  };

  const rejectChat = () => {
    if (!incoming) return;
    console.log("❌ Rejecting chat with customer:", incoming.customerId);
    socketRef.current.emit("rejectInteraction", { employeeId, customerId: incoming.customerId });
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
      customerId
    });
    setChat(prev => [...prev, { sender: "You", text: message }]);
    setMessage("");
  };

  // NEW: Manual completion function (optional - for employee to end chat)
  const completeChat = () => {
    if (!customerId) return;
    
    console.log("🏁 Employee manually completing chat with customer:", customerId);
    
    // Notify customer that employee is ending the chat
    socketRef.current.emit("sendMessage", { 
      sender: "employee", 
      receiverId: customerId, 
      text: "I'm ending this chat. Thank you for contacting us!", 
      role: "employee",
      customerId
    });
    
    // Emit completion event
    socketRef.current.emit("completeInteraction", { 
      customerId, 
      employeeId 
    });
    
    setChat(prev => [...prev, { 
      sender: "System", 
      text: "You ended the chat. Redirecting to dashboard..." 
    }]);
    
    setStatus("Chat completed - Redirecting...");
    
    // Redirect after short delay
    setTimeout(() => {
      navigate("/employee-dashboard");
    }, 2000);
  };

  if (!employeeId) {
    return (
      <div className="flex flex-col h-screen bg-zinc-950 text-gray-100 p-6 items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Employee Chat Dashboard</h1>
        <p className="text-gray-400">Loading employee data...</p>
        <p className="text-sm text-gray-500 mt-2">{status}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 bg-blue-600 px-4 py-2 rounded hover:bg-blue-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Employee Chat Dashboard</h1>
      
      <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
        <p className="text-sm"><strong>Employee ID:</strong> {employeeId}</p>
        <p className="text-sm"><strong>Status:</strong> {status}</p>
        <p className="text-sm"><strong>Current Customer:</strong> {customerId || "None"}</p>
        
        {socketStatus.summary && (
          <div className="mt-2 p-2 bg-zinc-700 rounded">
            <p className="text-xs font-semibold">System Status:</p>
            <p className="text-xs">Free Employees: {socketStatus.summary.freeEmployees}</p>
            <p className="text-xs">Total Customers: {socketStatus.summary.totalCustomers}</p>
          </div>
        )}
        
        <div className="mt-2 flex space-x-2">
          <button 
            onClick={checkSocketStatus}
            className="bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500"
          >
            Refresh Status
          </button>
          
          {/* NEW: Manual completion button */}
          {customerId && (
            <button 
              onClick={completeChat}
              className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-500"
            >
              End Chat
            </button>
          )}
        </div>
      </div>

      {incoming && (
        <div className="bg-yellow-900 border border-yellow-700 p-4 rounded-xl mb-4 animate-pulse">
          <p className="font-semibold text-yellow-300 text-lg">📨 INCOMING CHAT REQUEST!</p>
          <p className="text-gray-300 mt-2">Customer: {incoming.customerId}</p>
          <p className="text-gray-300">Type: {incoming.type}</p>
          <div className="mt-3 flex space-x-2">
            <button onClick={acceptChat} className="bg-green-600 px-6 py-2 rounded-xl hover:bg-green-500 font-semibold flex-1">✅ Accept Chat</button>
            <button onClick={rejectChat} className="bg-red-600 px-6 py-2 rounded-xl hover:bg-red-500 font-semibold flex-1">❌ Reject</button>
          </div>
        </div>
      )}

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

      {customerId && (
        <div className="flex space-x-2">
          <input
            className="flex-1 p-3 bg-zinc-800 rounded-xl border border-gray-700 text-gray-100"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} className="bg-green-600 px-6 rounded-xl hover:bg-green-500 font-semibold">Send</button>
        </div>
      )}
    </div>
  );
}