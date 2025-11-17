import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const {
    cartItems,
    cartSummary,
    updateQuantity,
    removeFromCart,
    clearCart,
    isAuthenticated,
    handleCheckout,
  } = useCart();

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

    const success = await handleCheckout();

    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }

    setLoading(false);
  };

  const handleQuantityChange = (productId, newQuantity) => {
    updateQuantity(productId, newQuantity);
  };

  const handleClearCart = () => {
    if (!window.confirm("Are you sure you want to clear your cart?")) return;
    clearCart();
  };

  return (
    <div className="min-h-screen bg-cies-900 text-white">
      {showSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Items purchased successfully! 🎉</span>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="flex items-center justify-between p-4 bg-cies-900 shadow-md sticky top-0 z-40">
        <div className="flex items-center space-x-6">
          <Link to="/" className="hover:text-cies-300">Home</Link>
          <Link to="/CustomerCare" className="hover:text-cies-300">Customer Care</Link>
          <Link to="/login" className="hover:text-cies-300">Login</Link>
          <Link to="/signup" className="hover:text-cies-300">Sign Up</Link>
          <Link to="/cart" className="hover:text-cies-300">Cart</Link>
        </div>
        <div className="flex items-center justify-center w-1/3">
          <input
            type="search"
            placeholder="Search..."
            className="w-full bg-cies-850/60 backdrop-blur-sm px-3 py-2 rounded-full text-white outline-none"
          />
        </div>
        <div className="flex items-center justify-center">
          <Link to="/cart" className="relative bg-cies-800 hover:bg-cies-700 w-10 h-10 flex items-center justify-center rounded-full">
            <ShoppingCart className="text-white w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartSummary.count}
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center text-orange-400 hover:text-orange-300">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Continue Shopping
          </Link>
          <h1 className="text-3xl font-bold">Your Shopping Cart</h1>
          <div className="w-20"></div>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
            <p className="text-gray-300 mb-8">
              {showSuccess ? "Your items have been purchased successfully! 🎉" : "Looks like you haven't added any items to your cart yet."}
            </p>
            <Link to="/" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-semibold">
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
                    Cart Items ({cartSummary.count})
                  </h2>
                  <button onClick={handleClearCart} className="text-red-400 hover:text-red-300 flex items-center">
                    <Trash2 className="w-4 h-4 mr-1" /> Clear Cart
                  </button>
                </div>

                <div className="space-y-4">
                  {cartItems.map((item, index) => (
                    <div key={`${item.productId}-${index}`} className="flex items-center bg-cies-700 rounded-xl p-4">
                      <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                      <div className="flex-1 ml-4">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <p className="text-orange-400 font-bold text-lg">${item.price.toFixed(2)}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1)} 
                          className="bg-cies-600 hover:bg-cies-500 w-8 h-8 rounded-full flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button 
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1)} 
                          className="bg-cies-600 hover:bg-cies-500 w-8 h-8 rounded-full flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.productId)} 
                        className="ml-4 text-red-400 hover:text-red-300 p-2"
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
                  <div className="flex justify-between"><span>Subtotal</span><span>${cartSummary.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span>{cartSummary.shipping === 0 ? 'FREE' : `$${cartSummary.shipping.toFixed(2)}`}</span></div>
                  <div className="flex justify-between"><span>Tax</span><span>${cartSummary.tax.toFixed(2)}</span></div>
                  <div className="border-t border-cies-600 pt-3 mt-3 flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-orange-400">${cartSummary.total.toFixed(2)}</span>
                  </div>
                </div>

                <button 
                  onClick={handleBuyNow} 
                  disabled={loading} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full font-semibold mb-4 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Buy Now 🛍️"}
                </button>

                <p className="text-center text-sm text-gray-400">
                  {cartSummary.subtotal < 50 ? `Add $${(50 - cartSummary.subtotal).toFixed(2)} more for free shipping!` : 'You qualify for free shipping!'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}