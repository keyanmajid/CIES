import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, ChevronLeft, ChevronRight, User } from "lucide-react"; 
import { io } from "socket.io-client";

// Mock hooks and data
const useCart = () => ({
    addToCart: async (product) => { console.log("Added to cart:", product.name); return { success: true }; },
    cartCount: 2,
    isAuthenticated: true,
});

const mockProducts = [
    { _id: "1", name: "Product 1", description: "Test product", price: 99.99, imageUrl: "product1.jpg" },
    { _id: "2", name: "Product 2", description: "Another product", price: 149.99, imageUrl: "product2.jpg" }
];

const backendImagePath = (path) => `https://cies-5dc4.onrender.com/uploads/${path}`;
const formatPrice = (price) => `$${price?.toFixed(2) || '0.00'}`;

export default function ChatCustomer() {
    const { addToCart, cartCount, isAuthenticated } = useCart();
    const [customerId] = useState(() => localStorage.getItem("customerId") || `cust-${Date.now()}`);
    const [employeeId, setEmployeeId] = useState(null);
    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("Waiting to connect...");
    const socketRef = useRef(null);
    const chatEndRef = useRef(null);
    
    // Navbar/Search State
    const [userName, setUserName] = useState("Guest");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);

    // --- FIXED: Get user name properly ---
    useEffect(() => {
  const getUserName = () => {
    try {
      console.log("🔄 Checking for user data...");
      
      // Method 1: Check localStorage user data first
      const userData = localStorage.getItem("user");
      console.log("📦 Raw userData from localStorage:", userData);
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log("🔍 Parsed user object:", user);
          
          if (user && user.name) {
            const name = user.name;
            setUserName(name);
            console.log("✅ Set userName from user.name:", name);
            
            // Also store it for the chat
            localStorage.setItem("userName", name);
            return;
          }
          
          if (user && user.email) {
            const nameFromEmail = user.email.split('@')[0];
            setUserName(nameFromEmail);
            console.log("✅ Set userName from user.email:", nameFromEmail);
            
            localStorage.setItem("userName", nameFromEmail);
            return;
          }
          
          if (user && user.username) {
            setUserName(user.username);
            console.log("✅ Set userName from user.username:", user.username);
            
            localStorage.setItem("userName", user.username);
            return;
          }
          
        } catch (parseError) {
          console.log("❌ Error parsing user data:", parseError);
        }
      }

      // Method 2: Check for existing userName in localStorage
      const storedUserName = localStorage.getItem("userName");
      if (storedUserName && storedUserName !== "Guest") {
        setUserName(storedUserName);
        console.log("✅ Set userName from localStorage userName:", storedUserName);
        return;
      }

      // Final fallback
      console.log("❌ No user data found, using Guest");
      setUserName("Guest");
      
    } catch (error) {
      console.error("❌ Error in getUserName:", error);
      setUserName("Guest");
    }
  };

  getUserName();
}, [isAuthenticated]);
    // Scroll to bottom of chat whenever messages update
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    useEffect(() => {
        localStorage.setItem("customerId", customerId);

        const socket = io("https://cies-5dc4.onrender.com", {
            transports: ["polling", "websocket"]
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            setStatus("Connected to system");
            socket.emit("registerCustomer", customerId);
        });

        socket.on("noEmployee", (msg) => setStatus(msg));

        socket.on("interactionAccepted", ({ employeeId }) => {
            setEmployeeId(employeeId);
            setStatus("Connected to an employee");
        });

        socket.on("interactionCompleted", () => {
            setStatus("Chat completed - Employee redirected to dashboard");
            setEmployeeId(null);
        });

        const receiveHandler = ({ sender, text }) =>
            setChat(prev => [...prev, { sender, text }]);
        socket.on("receiveMessage", receiveHandler);

        return () => {
            socket.off("receiveMessage", receiveHandler);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [customerId]);

    // --- IMPROVED: Better customer name logic ---
const startChat = () => {
  const s = socketRef.current;
  if (!s || !s.connected) {
    setStatus("Not connected to server");
    return;
  }

  console.log("🔍 DEBUG startChat - Current userName state:", userName);

  // Get customer name - prioritize actual user data
  let customerName = "Guest";
  
  // Method 1: Use the userName state (which should be "ariz majid")
  if (userName && userName !== "Guest") {
    customerName = userName;
    console.log("✅ Using userName state:", customerName);
  } 
  // Method 2: Fallback to localStorage user data
  else {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.name) {
          customerName = user.name;
          console.log("✅ Using user.name from localStorage:", customerName);
        }
      }
    } catch (e) {
      console.log("❌ Error getting user data from localStorage");
    }
  }

  // Method 3: Final fallback - but this should rarely happen now
  if (customerName === "Guest") {
    customerName = `Customer ${customerId.substring(5, 10)}`;
    console.log("🔄 Created customer name from ID:", customerName);
  }

  console.log("🚀 FINAL customerName for socket:", customerName);
  
  s.emit("startInteraction", { 
    customerId, 
    customerName, // This should be "ariz majid"
    type: "chat" 
  });

  setStatus("Looking for an available employee...");
};
    const sendMessage = () => {
        if (!message.trim() || !employeeId) return;
        const s = socketRef.current;
        s.emit("sendMessage", {
            sender: "customer",
            receiverId: employeeId,
            text: message,
            role: "customer",
            customerId
        });
        setChat(prev => [...prev, { sender: "You", text: message }]);
        setMessage("");
    };

    const completeInteraction = async () => {
        try {
            const response = await fetch(`https://cies-5dc4.onrender.com/api/interaction/complete/${customerId}`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                setStatus("Interaction completed ✅ - Employee redirected to dashboard");
                
                if (socketRef.current && employeeId) {
                    socketRef.current.emit("completeInteraction", {
                        customerId,
                        employeeId
                    });
                }
                
                setEmployeeId(null);
                setChat([]);
            } else {
                setStatus("Error completing interaction ❌");
            }
        } catch (err) {
            console.error("Completion error:", err);
            setStatus("Error completing interaction ❌");
        }
    };

    // Search function and other existing code remains the same...
    const handleSearch = () => {
        const trimmedQuery = searchQuery.trim().toLowerCase();
        
        if (trimmedQuery === "") {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearchLoading(true);
        setIsSearching(true);

        const results = mockProducts.filter(p => 
            p.name.toLowerCase().includes(trimmedQuery) || 
            p.description.toLowerCase().includes(trimmedQuery)
        );

        setSearchResults(results);
        setIsSearchLoading(false);
    };

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setIsSearching(false);
            setIsSearchLoading(false);
            setSearchResults([]);
            return;
        }

        const delay = setTimeout(() => {
            handleSearch();
        }, 400);

        return () => clearTimeout(delay);
    }, [searchQuery]);

    const handleAddToCart = async (product) => {
        const result = await addToCart(product);
        if (result && result.success) console.log(`${product.name} added to cart!`);
        else console.error(result?.error || "Failed to add item to cart.");
    };

 

    // Mock data for the context card
    const quickLinks = [
        { label: "FAQ Center", icon: "❓" },
        { label: "Documentation", icon: "📚" },
        { label: "Service Status", icon: "🟢" },
    ];

    return (
        <div className="min-h-screen w-full bg-cies-900 text-white font-sans">
            
            {/* NAVBAR (Copied from Home.jsx) */}
            <nav className="flex items-center justify-between p-4 bg-cies-900 shadow-md sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    {/* Burger Button */}
                    <button
                        className="md:hidden w-6 h-5 flex flex-col justify-between"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <span className="w-full h-0.5 bg-white"></span>
                        <span className="w-full h-0.5 bg-white"></span>
                        <span className="w-full h-0.5 bg-white"></span>
                    </button>

                    {/* Desktop Links */}
                    <div className="hidden md:flex space-x-6 text-sm font-medium">
                        <Link to="/" className="hover:text-cies-300 transition-colors">Home</Link>
                        <Link to="/chat/customer" className="text-orange-400 font-semibold">Customer Care</Link>
                        <Link to="/login" className="hover:text-cies-300 transition-colors">Login</Link>
                        <Link to="/signup" className="hover:text-cies-300 transition-colors">Sign Up</Link>
                        <Link to="/manager-dashboard" className="hover:text-cies-300 transition-colors">Manager Dashboard</Link>
                    </div>
                </div>

                {/* SEARCH BAR CONTAINER */}
                <div className="flex items-center w-full md:w-1/3 relative"> 
                    <div className="w-full max-w-md border border-cies-700 rounded-full bg-cies-850/60 px-3 py-2">
                        <input
                            type="search"
                            placeholder="Search CIES products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                            onFocus={() => searchQuery.trim() !== "" && setIsSearching(true)}
                            className="w-full bg-transparent outline-none text-sm"
                        />
                    </div>

                    {/* SEARCH RESULTS OVERLAY */}
                    {isSearching && (
                        <div className="absolute top-full mt-2 w-full max-w-md bg-cies-800 border border-cies-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50">
                            {isSearchLoading ? (
                                <div className="p-3 text-center text-gray-400 text-sm">Searching...</div>
                            ) : searchResults.length > 0 ? (
                                <>
                                    {searchResults.slice(0, 5).map((product) => (
                                        <div 
                                            key={product._id} 
                                            className="flex items-center justify-between p-3 border-b border-cies-700 last:border-b-0 hover:bg-cies-700/50 transition-colors"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <img
                                                    src={backendImagePath(product.imageUrl)}
                                                    alt={product.name}
                                                    className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                                                />
                                                <div>
                                                    <h4 className="text-sm font-semibold truncate max-w-[150px]">{product.name}</h4>
                                                    <p className="text-orange-400 text-xs">{formatPrice(product.price)}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 text-xs rounded-full flex items-center flex-shrink-0"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                    <Link 
                                        to={`/search-results?query=${searchQuery}`} 
                                        className="block text-center py-2 text-xs text-cies-300 hover:text-white border-t border-cies-700"
                                        onClick={() => setIsSearching(false)}
                                    >
                                        See all {searchResults.length} results
                                    </Link>
                                </>
                            ) : (
                                <div className="p-3 text-center text-gray-400 text-sm">No products found for "{searchQuery}"</div>
                            )}
                        </div>
                    )}
                </div>

                {/* USER + CART */}
                <div className="flex items-center space-x-4">
                    {isAuthenticated ? (
                        <div className="hidden md:flex items-center space-x-2 bg-cies-800 px-4 py-2 rounded-full text-sm">
                            <User className="w-4 h-4 text-cies-300" />
                            <span>Hello, {userName}</span>
                        </div>
                    ) : (
                        <Link to="/login" className="hidden md:flex items-center space-x-2 bg-cies-800 px-4 py-2 rounded-full hover:bg-cies-700 transition-colors text-sm">
                            <User className="w-4 h-4 text-cies-300" />
                            <span>Login</span>
                        </Link>
                    )}

                    <Link to="/cart" className="relative bg-cies-800 hover:bg-cies-700 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                        <ShoppingCart className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-xs w-4 h-4 rounded-full flex items-center justify-center">
                            {cartCount}
                        </span>
                    </Link>
                </div>
            </nav>

            {/* MOBILE MENU */}
            {isMenuOpen && (
                <div className="md:hidden absolute left-0 right-0 bg-cies-800 border-t border-cies-700 shadow-xl z-40">
                    <div className="flex flex-col p-4 space-y-3">
                        <Link to="/" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Home</Link>
                        <Link to="/chat/customer" onClick={() => setIsMenuOpen(false)} className="py-2 text-orange-400 font-semibold border-b border-cies-700/50">Customer Care</Link>
                        <Link to="/login" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Login</Link>
                        <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white border-b border-cies-700/50">Sign Up</Link>
                        <Link to="/manager-dashboard" onClick={() => setIsMenuOpen(false)} className="py-2 text-cies-300 hover:text-white">Manager Dashboard</Link>
                    </div>
                </div>
            )}
            
            {/* MAIN CHAT CONTENT AREA */}
            <div className="p-4 sm:p-8 
                          bg-[linear-gradient(to_bottom_right,#0f0e1f,#05050a)] h-[calc(100vh-64px)] overflow-y-auto">

                {/* MAIN CHAT GRID (Responsive Grid/Flex) */}
                <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-4 lg:gap-6 h-full"> 
                    
                    {/* LEFT SIDEBAR: ACCOUNT CONTEXT & QUICK LINKS */}
                    <div className="hidden lg:block backdrop-blur-xl bg-white/5 p-4 sm:p-5 rounded-3xl 
                                    shadow-2xl shadow-black/70 border border-white/20 overflow-y-auto"> 
                        <h2 className="text-lg sm:text-xl font-bold mb-4 text-white border-b border-white/10 pb-2">
                            Account Context
                        </h2>

                        {/* Customer Info Card */}
                        <div className="mb-4 p-3 sm:p-4 bg-white/10 rounded-xl border border-white/10">
                            <p className="text-xs text-white/50 mb-1">Your ID (For Reference):</p>
                            <p className="font-mono text-xs sm:text-sm break-all mb-3">{customerId}</p>
                            
                            <p className="text-xs text-white/50 mb-1">Status:</p>
                            <p className={`font-semibold text-sm ${employeeId ? 'text-green-400' : status.includes('completed') ? 'text-blue-400' : 'text-yellow-400'}`}>
                                {employeeId ? 'Chat Active' : status.includes('completed') ? 'Chat Completed' : 'Waiting in Queue'}
                            </p>
                        </div>

                        {/* Quick Links */}
                        <h3 className="text-base sm:text-lg font-semibold mb-3 text-white">Need Quick Help?</h3>
                        {quickLinks.map((link, index) => (
                            <div key={index} 
                                className="flex items-center p-3 mb-2 bg-white/5 rounded-xl transition-colors hover:bg-blue-600/30 cursor-pointer">
                                <span className="mr-3 text-sm">{link.icon}</span>
                                <span className="text-xs sm:text-sm">{link.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* RIGHT CHAT PANEL CONTAINER */}
                    <div className="flex flex-col h-full w-full lg:col-span-1 min-h-[300px] lg:min-h-0">
                        
                        {/* A. CHAT DISPLAY AREA + INPUT (Single Glass Panel) */}
                        <div className="backdrop-blur-xl bg-white/5 rounded-3xl flex-1 
                                        shadow-2xl shadow-black/70 border border-white/20 flex flex-col">
                            
                            {/* Chat Messages Area (Scrollable) */}
                            <div className="p-4 flex-1 overflow-y-auto">
                                {chat.length === 0 && !employeeId && !status.includes('completed') && (
                                    <p className="text-center text-white/50 italic pt-12">
                                        Click "Start Chat" to connect with an available employee.
                                    </p>
                                )}
                                {status.includes('completed') && (
                                    <p className="text-center text-green-400 font-semibold pt-12">
                                        ✅ Chat completed successfully! The employee has been redirected to their dashboard.
                                    </p>
                                )}
                                {chat.map((msg, i) => (
                                    <div key={i} className={`mb-4 flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[85%] text-sm p-3 rounded-2xl 
                                            ${msg.sender === "You"
                                                ? "bg-blue-600/80 text-white rounded-br-md"
                                                : "bg-white/10 text-gray-200 rounded-tl-md border border-white/10" 
                                            }`}>
                                            {msg.sender !== "You" && <span className="font-semibold text-xs text-blue-300 block mb-1">Employee</span>}
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} /> {/* Scroll anchor */}
                            </div>

                            {/* Input Area (Fixed to bottom of glass panel) */}
                            <div className="p-4 border-t border-white/10">
                                <div className="flex space-x-3">
                                    <input
                                        className="flex-1 p-3 sm:p-4 bg-white/10 rounded-2xl border border-white/20 text-gray-100 
                                                    placeholder-white/50 focus:ring-2 focus:ring-blue-500 transition-shadow outline-none backdrop-blur-md text-sm sm:text-base"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyPress={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                        placeholder={employeeId ? "Type a message..." : status.includes('completed') ? "Chat completed" : "Connect to send..."}
                                        disabled={!employeeId || status.includes('completed')}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        className={`px-4 sm:px-5 rounded-2xl text-lg font-semibold transition-all flex items-center justify-center 
                                                    ${employeeId && !status.includes('completed') ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 cursor-not-allowed'}`}
                                        disabled={!employeeId || status.includes('completed')}
                                    >
                                        <span role="img" aria-label="Send">➡️</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* B. Status & Controls (Buttons below glass panel) */}
                        <div className="mt-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                                <p className={`text-sm font-medium px-3 py-1 rounded-full w-fit ${
                                    status.includes('completed') ? 'bg-green-700/50 text-green-300' :
                                    employeeId ? 'bg-green-700/50 text-green-300' : 'bg-blue-700/50 text-blue-300'
                                }`}>
                                    {status}
                                </p>
                                <div className="flex space-x-3">
                                    <button 
                                        onClick={startChat} 
                                        className={`px-5 py-2 rounded-xl text-sm sm:text-base font-semibold transition-colors 
                                            ${employeeId || status.includes('completed') ? 'bg-gray-700 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500'}`}
                                        disabled={!!employeeId || status.includes('completed')}
                                    >
                                        Start Chat
                                    </button>
                                    <button 
                                        onClick={completeInteraction} 
                                        className={`px-5 py-2 rounded-xl text-sm sm:text-base font-semibold transition-colors 
                                            ${employeeId && !status.includes('completed') ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 cursor-not-allowed'}`}
                                        disabled={!employeeId || status.includes('completed')}
                                    >
                                        Complete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}