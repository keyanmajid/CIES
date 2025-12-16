import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate, Link } from "react-router-dom";
import { 
  Send, 
  User, 
  MessageCircle, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  LogOut,
  Home,
  BarChart3,
  Activity,
  Menu,
  X,
  ChevronLeft,
  Headphones,
  Shield,
  Bell,
  Settings,
  Phone,
  Video,
  Paperclip,
  Smile,
  Search,
  PhoneOff,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  Zap,
  AlertCircle,
  Star,
  TrendingUp,
  MessageSquareWarning
} from "lucide-react";

export default function ChatEmployee() {
  const [employeeId, setEmployeeId] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [chat, setChat] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Initializing...");
  const [socketStatus, setSocketStatus] = useState({});
  const socketRef = useRef(null);
  const navigate = useNavigate();
  
  // UI states
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [employeeData, setEmployeeData] = useState(null);
  const chatContainerRef = useRef(null);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && sidebarOpen) {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburger-btn');
        if (sidebar && !sidebar.contains(event.target) && 
            hamburger && !hamburger.contains(event.target)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, sidebarOpen]);

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
            setEmployeeData(user);
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

    socket.on("redirectToDashboard", (data) => {
      console.log("📊 Redirecting to dashboard:", data);
      setStatus("✅ Chat completed - Redirecting to dashboard...");
      
      setChat(prev => [...prev, { 
        sender: "System", 
        text: `Chat completed successfully. Redirecting to dashboard...` 
      }]);
      
      setTimeout(() => {
        navigate("/employee-dashboard");
      }, 2000);
    });

    socket.on("interactionCompleted", (data) => {
      console.log("✅ Interaction completed notification:", data);
      setStatus("Chat completed by customer");
      setChat(prev => [...prev, { 
        sender: "System", 
        text: "Customer has ended the chat. You will be redirected shortly..." 
      }]);
    });

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
  }, [employeeId, navigate]);

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

  const completeChat = () => {
    if (!customerId) return;
    
    console.log("🏁 Employee manually completing chat with customer:", customerId);
    
    socketRef.current.emit("sendMessage", { 
      sender: "employee", 
      receiverId: customerId, 
      text: "I'm ending this chat. Thank you for contacting us!", 
      role: "employee",
      customerId
    });
    
    socketRef.current.emit("completeInteraction", { 
      customerId, 
      employeeId 
    });
    
    setChat(prev => [...prev, { 
      sender: "System", 
      text: "You ended the chat. Redirecting to dashboard..." 
    }]);
    
    setStatus("Chat completed - Redirecting...");
    
    setTimeout(() => {
      navigate("/employee-dashboard");
    }, 2000);
  };

  const handleLogout = () => {
    if (socketRef.current) socketRef.current.disconnect();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!employeeId) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-black text-white items-center justify-center p-6">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-gray-700/50 shadow-2xl">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Employee Chat Dashboard</h1>
            <p className="text-gray-400 text-center mb-6">Loading employee data...</p>
            <div className="w-full bg-gray-700/50 rounded-full h-2 mb-4 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full animate-pulse"></div>
            </div>
            <p className="text-sm text-gray-500 mb-6">{status}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 rounded-xl hover:opacity-90 transition-all font-medium w-full"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        id="sidebar"
        className={`
          fixed lg:relative z-50 h-full transition-all duration-300 ease-in-out
          ${isMobile 
            ? `${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-72`
            : 'w-72'
          }
          bg-gray-800/80 backdrop-blur-xl border-r border-gray-700/50
        `}
      >
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Chat System</h1>
                <p className="text-gray-400 text-sm">Employee Portal</p>
              </div>
            </div>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        {/* User Profile */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center relative">
              <User className="w-7 h-7 text-white" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-800"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{employeeData?.name || 'Employee'}</h3>
              <p className="text-gray-400 text-sm">{employeeData?.role || 'Support Agent'}</p>
              <div className="flex items-center mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <p className="text-xs text-gray-400">Online • ID: {employeeId?.substring(0, 8)}...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <div className="space-y-1">
            <Link
              to="/employee-dashboard"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-xl transition-all group"
            >
              <BarChart3 className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-400" />
              <span>Dashboard Overview</span>
              <ChevronLeft className="w-4 h-4 ml-auto text-gray-500 group-hover:text-blue-400 rotate-180" />
            </Link>
            
            <button className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-xl transition-all group w-full">
              <Activity className="w-5 h-5 mr-3 text-gray-400 group-hover:text-green-400" />
              <span>Performance Analytics</span>
            </button>
            
            <button className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-xl transition-all group w-full">
              <ShieldCheck className="w-5 h-5 mr-3 text-gray-400 group-hover:text-purple-400" />
              <span>Toxicity Monitor</span>
            </button>
            
            <Link
              to="/"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-xl transition-all group"
            >
              <Home className="w-5 h-5 mr-3 text-gray-400 group-hover:text-yellow-400" />
              <span>Back to Home</span>
            </Link>
          </div>
        </nav>

        {/* Stats */}
        <div className="p-4">
          <div className="bg-gray-900/50 rounded-xl p-4">
            <h4 className="text-sm text-gray-400 mb-3">Today's Stats</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Chats Today</span>
                <span className="text-white font-semibold">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Avg. Rating</span>
                <span className="text-white font-semibold flex items-center">
                  <Star className="w-3 h-3 mr-1 text-yellow-400 fill-yellow-400" />
                  4.8
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Response Time</span>
                <span className="text-green-400 font-semibold">45s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-gray-300 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all group"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                id="hamburger-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-white lg:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center">
                  <MessageSquare className="w-6 h-6 mr-2 text-blue-400" />
                  Live Chat Support
                </h1>
                <p className="text-gray-400 text-sm">{status}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center bg-gray-700/50 px-3 py-1.5 rounded-lg">
                  <Headphones className="w-4 h-4 mr-2 text-green-400" />
                  <span className="text-sm">Ready</span>
                </div>
                <div className="flex items-center bg-gray-700/50 px-3 py-1.5 rounded-lg">
                  <Users className="w-4 h-4 mr-2 text-blue-400" />
                  <span className="text-sm">{socketStatus.summary?.freeEmployees || 0} Available</span>
                </div>
                <div className="text-gray-400 text-sm">{time}</div>
              </div>
              
              <button
                onClick={checkSocketStatus}
                className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl hover:opacity-90 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Incoming Request */}
        {incoming && (
          <div className="m-4 animate-pulse">
            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 backdrop-blur-lg border border-yellow-700/50 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-yellow-300">📨 INCOMING REQUEST!</h2>
                    <p className="text-gray-300">New customer wants to connect</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Customer ID</div>
                  <div className="font-mono font-bold">{incoming.customerId.substring(0, 12)}...</div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <User className="w-4 h-4 mr-2 text-blue-400" />
                    <span className="text-gray-400 text-sm">Customer</span>
                  </div>
                  <p className="font-semibold">ID: {incoming.customerId}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <MessageSquareWarning className="w-4 h-4 mr-2 text-purple-400" />
                    <span className="text-gray-400 text-sm">Request Type</span>
                  </div>
                  <p className="font-semibold capitalize">{incoming.type}</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={acceptChat} 
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 rounded-xl hover:opacity-90 transition-all font-semibold text-lg flex items-center justify-center"
                >
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Accept Chat
                </button>
                <button 
                  onClick={rejectChat} 
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 px-8 py-4 rounded-xl hover:opacity-90 transition-all font-semibold text-lg flex items-center justify-center"
                >
                  <XCircle className="w-6 h-6 mr-2" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex-1 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden flex flex-col">
            {/* Chat Header */}
            {customerId && (
              <div className="bg-gray-800/50 border-b border-gray-700/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Customer {customerId.substring(0, 8)}...</h3>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-xs text-gray-400">Online • Active now</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-gray-700/50 rounded-xl transition-all">
                      <Phone className="w-5 h-5 text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-700/50 rounded-xl transition-all">
                      <Video className="w-5 h-5 text-gray-400" />
                    </button>
                    <button 
                      onClick={completeChat}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl hover:opacity-90 transition-all font-medium flex items-center"
                    >
                      <PhoneOff className="w-4 h-4 mr-2" />
                      End Chat
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {chat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <div className="w-24 h-24 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center mb-6 border border-gray-700/50">
                    <MessageCircle className="w-12 h-12 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Welcome to Live Chat</h3>
                  <p className="text-gray-500 text-center max-w-md">
                    {customerId 
                      ? "Start the conversation with your customer"
                      : "Waiting for incoming chat requests. You'll be notified when a customer needs help."}
                  </p>
                  {!customerId && (
                    <div className="mt-6 flex items-center text-gray-500">
                      <Zap className="w-4 h-4 mr-2 text-yellow-500 animate-pulse" />
                      <span>Status: {status}</span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {chat.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"} animate-fadeIn`}
                    >
                      <div className={`max-w-[70%] rounded-2xl p-4 ${
                        msg.sender === "You" 
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-none" 
                          : msg.sender === "System" 
                            ? "bg-gray-800/50 text-gray-300 rounded-tl-none border border-gray-700/50"
                            : "bg-gray-700/50 text-white rounded-tl-none"
                      }`}>
                        <div className="flex items-center mb-1">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            msg.sender === "You" ? "bg-blue-300" : 
                            msg.sender === "System" ? "bg-yellow-500" : "bg-green-400"
                          }`} />
                          <span className="font-semibold text-sm">
                            {msg.sender === "You" ? "You" : 
                             msg.sender === "System" ? "System" : "Customer"}
                          </span>
                          <span className="text-xs opacity-70 ml-2">{time}</span>
                        </div>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            
            {/* Message Input */}
            {customerId && (
              <div className="border-t border-gray-700/50 p-4">
                <div className="flex items-center space-x-3">
                  <button className="p-3 hover:bg-gray-700/50 rounded-xl transition-all">
                    <Paperclip className="w-5 h-5 text-gray-400" />
                  </button>
                  <input
                    className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button className="p-3 hover:bg-gray-700/50 rounded-xl transition-all">
                    <Smile className="w-5 h-5 text-gray-400" />
                  </button>
                  <button 
                    onClick={sendMessage}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl hover:opacity-90 transition-all"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* System Status */}
          {socketStatus.summary && (
            <div className="mt-4 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-green-400" />
                  System Status
                </h3>
                <span className="text-xs text-gray-400">Updated just now</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <div className="text-gray-400 text-xs mb-1">Available Agents</div>
                  <div className="text-xl font-bold">{socketStatus.summary.freeEmployees || 0}</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <div className="text-gray-400 text-xs mb-1">Active Chats</div>
                  <div className="text-xl font-bold text-green-400">{socketStatus.summary.totalCustomers || 0}</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <div className="text-gray-400 text-xs mb-1">Connection</div>
                  <div className="text-xl font-bold text-green-400">Stable</div>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <div className="text-gray-400 text-xs mb-1">Response Time</div>
                  <div className="text-xl font-bold">45ms</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}