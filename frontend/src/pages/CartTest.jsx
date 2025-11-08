import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext"; // Adjust path as needed

export default function Cart() {
  const { 
    cartItems, 
    cartCount, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    isAuthenticated 
  } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    const price = typeof item.price === 'number' ? item.price : parseFloat(item.price);
    return sum + (price * item.quantity);
  }, 0);
  
  const shipping = subtotal > 50 ? 0 : 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handleBuyNow = async () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    if (!isAuthenticated) {
      alert("Please login to complete your purchase!");
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setShowSuccess(true);
      clearCart(); // Clear the cart after successful purchase
      setLoading(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }, 1500);
  };

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    updateQuantity(productId, newQuantity);
  };

  const handleClearCart = () => {
    if (!window.confirm("Are you sure you want to clear your cart?")) return;
    clearCart();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cies-900 flex items-center justify-center">
        <div className="text-white text-xl">Processing your order...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cies-900 text-white">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Items purchased successfully! 🎉</span>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="flex items-center justify-between p-4 bg-cies-900 shadow-md sticky top-0 z-40">
        <div className="flex items-center space-x-6">
          <Link to="/" className="hover:text-cies-300 transition-colors">Home</Link>
          <Link to="/CustomerCare" className="hover:text-cies-300 transition-colors">Customer Care</Link>
          <Link to="/login" className="hover:text-cies-300 transition-colors">Login</Link>
          <Link to="/signup" className="hover:text-cies-300 transition-colors">Sign Up</Link>
          <Link to="/cart" className="hover:text-cies-300 transition-colors">Cart</Link>
        </div>
        <div className="flex items-center justify-center w-1/3">
          <div className="flex items-center w-full max-w-md border border-cies-700 rounded-full bg-cies-850/60 backdrop-blur-sm px-3 py-2 focus-within:bg-cies-800/70 transition-all duration-200">
            <input type="search" placeholder="Search..." className="w-full bg-transparent text-white placeholder-gray-300 outline-none px-2" />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <Link to="/cart" className="relative bg-cies-800 hover:bg-cies-700 w-10 h-10 flex items-center justify-center rounded-full shadow-md cursor-pointer transition-colors">
            <ShoppingCart className="text-white w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {cartCount}
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center text-orange-400 hover:text-orange-300 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Continue Shopping
          </Link>
          <h1 className="text-3xl font-bold">Your Shopping Cart</h1>
          <div className="w-20"></div>
        </div>

        {cartItems.length === 0 ? (
          // Empty Cart State
          <div className="text-center py-16">
            <ShoppingBag className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
            <p className="text-gray-300 mb-8">
              {showSuccess ? "Your items have been purchased successfully! 🎉" : "Looks like you haven't added any items to your cart yet."}
            </p>
            <Link 
              to="/" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-semibold transition inline-block"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-cies-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">
                    Cart Items ({cartCount})
                  </h2>
                  <button 
                    onClick={handleClearCart}
                    className="text-red-400 hover:text-red-300 transition-colors text-sm flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear Cart
                  </button>
                </div>

                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.productId || item.id} className="flex items-center bg-cies-700 rounded-xl p-4">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      
                      <div className="flex-1 ml-4">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <p className="text-orange-400 font-bold text-lg">
                          ${typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => handleQuantityChange(item.productId || item.id, item.quantity - 1)}
                          className="bg-cies-600 hover:bg-cies-500 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        <span className="w-8 text-center font-semibold">
                          {item.quantity}
                        </span>
                        
                        <button 
                          onClick={() => handleQuantityChange(item.productId || item.id, item.quantity + 1)}
                          className="bg-cies-600 hover:bg-cies-500 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.productId || item.id)}
                        className="ml-4 text-red-400 hover:text-red-300 transition-colors p-2"
                        title="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-cies-800 rounded-2xl p-6 sticky top-8">
                <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-cies-600 pt-3 mt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span className="text-orange-400">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Buy Now Button */}
                <button 
                  onClick={handleBuyNow}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full font-semibold transition mb-4 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Buy Now 🛍️"}
                </button>

                <p className="text-center text-sm text-gray-400">
                  {subtotal < 50 ? `Add $${(50 - subtotal).toFixed(2)} more for free shipping!` : 'You qualify for free shipping!'}
                </p>

                {/* Security Badges */}
                <div className="mt-6 pt-6 border-t border-cies-600">
                  <div className="flex justify-center space-x-4 text-gray-400">
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto mb-1 bg-gray-700 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-xs">Secure</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto mb-1 bg-gray-700 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-xs">Fast Delivery</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}