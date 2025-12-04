import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingCart, User } from "lucide-react";
import { useCart } from "../context/CartContext";

const Login = () => {
  const navigate = useNavigate();
  const { cartCount, isAuthenticated, userName, login, logout } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    const data = {
      email: e.target.email.value,
      password: e.target.password.value,
    };

    try {
      const res = await fetch("https://cies-5dc4.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        let token = result.token;
        let userData = null;

        // --- Data Extraction Logic ---
        if (result.user) userData = result.user;
        else if (result.data && result.data.user) userData = result.data.user;
        else if (result.data) userData = result.data;
        
        // Ensure user object has name and role
        if (userData) {
          // If name is missing, generate it from email
          if (!userData.name && userData.email) {
            userData.name = userData.email.split("@")[0];
          }
        } else {
          // fallback minimal user
          userData = {
            name: data.email.split("@")[0],
            role: result.role || "customer",
            _id: "temp_" + Date.now(),
          };
          token = token || "temp_token_" + Date.now();
        }
        
        const role = userData?.role || result.role || "customer";
        
        // 🔥 CRITICAL FIX: Store user data in localStorage
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Calls the login function from context to update global state
        login(token, userData); 

        alert("Login Successful ✅");

        // In your Login handleLogin function:
switch (role) {
  case "customer":
    navigate("/");
    break;
  case "employee":
    navigate("/employee-dashboard");
    break;
  case "manager":
    navigate("/care"); // This goes to CustomerCare (your dashboard)
    break;
  default:
    navigate("/");
}
      } else {
        alert(result.message || "Login failed ❌");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#007896] to-black">
      <nav className="flex items-center text-white justify-between p-4 from-[#007896] shadow-md sticky top-0 z-50">
        {/* Left: Logo + Hamburger */}
        <div className="flex items-center space-x-4">
          <button
            className="md:hidden flex flex-col justify-between w-6 h-5 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="block w-full h-0.5 bg-white rounded-sm"></span>
            <span className="block w-full h-0.5 bg-white rounded-sm"></span>
            <span className="block w-full h-0.5 bg-white rounded-sm"></span>
          </button>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-cies-300 transition-colors">Home</Link>
            <Link to="/CustomerCare" className="hover:text-cies-300 transition-colors">Customer Care</Link>
            <Link to="/login" className="hover:text-cies-300 transition-colors">Login</Link>
            <Link to="/signup" className="hover:text-cies-300 transition-colors">Sign Up</Link>
            <Link to="/manager-dashboard" className="hover:text-cies-300 transition-colors">Manager Dashboard</Link>
          </div>
        </div>

        {/* Right: Cart + User */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="hidden md:flex items-center space-x-2 bg-cies-800 px-4 py-2 rounded-full text-sm">
              <User className="w-4 h-4 text-cies-300" />
              <span>Hello, {userName}</span>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center space-x-2 bg-cies-800 px-4 py-2 rounded-full hover:bg-cies-700 transition-colors"
            >
              <User className="w-4 h-4 text-cies-300" />
              <span>Login</span>
            </Link>
          )}
          {/* Logout button for authenticated users on this page (if they navigated back) */}
          {isAuthenticated && (
              <button
                 onClick={logout}
                 className="hidden md:block bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm transition-colors"
             >
                 Logout
             </button>
          )}

          {/* Cart Always Visible */}
          <Link
            to="/cart"
            className="relative bg-cies-800 hover:bg-cies-700 w-10 h-10 flex items-center justify-center rounded-full shadow-md cursor-pointer transition-colors"
          >
            <ShoppingCart className="text-white w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {cartCount}
            </span>
          </Link>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-cies-900 md:hidden flex flex-col items-center space-y-2 py-4 border-t border-cies-700 z-40">
            <Link to="/" className="hover:text-cies-300 transition-colors">Home</Link>
            <Link to="/CustomerCare" className="hover:text-cies-300 transition-colors">Customer Care</Link>
            <Link to="/login" className="hover:text-cies-300 transition-colors">Login</Link>
            <Link to="/signup" className="hover:text-cies-300 transition-colors">Sign Up</Link>
            <Link to="/manager-dashboard" className="hover:text-cies-300 transition-colors">Manager Dashboard</Link>
            {isAuthenticated && (
              <button onClick={logout} className="hover:text-red-400 transition-colors">Logout</button>
            )}
          </div>
        )}
      </nav>
      
      {/* LOGIN FORM SECTION */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          {/* Left Side */}
          <div
            className="md:w-1/2 bg-cover bg-center p-8 flex flex-col justify-center items-center text-white relative"
            style={{
              backgroundImage: "url('/Images/3dd9db7384d6d8879c288d7f456357bc.jpg')",
            }}
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white bg-opacity-10 rounded-full translate-x-20 translate-y-20"></div>

            <div className="relative z-10 text-center">
              <h1 className="text-4xl font-bold mb-4">Join Our Creative Community</h1>
              <p className="text-lg opacity-90 mb-6">
                Share your artwork with thousands of artists and get discovered by clients worldwide.
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="md:w-1/2 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Login To Your Account</h2>
              <p className="text-gray-600 mt-2">Share your artwork and Get projects!</p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="john@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </a>
              </div>

              {/* Button */}
              <button
                type="submit"
                className="w-full bg-black text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-800 transition shadow-lg"
              >
                Log In
              </button>

              <p className="text-center text-sm text-gray-600 mt-4">
                Don't have an account?{" "}
                <a href="/signup" className="text-blue-600 hover:underline">
                  Sign up
                </a>
              </p>
            </form>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Login;