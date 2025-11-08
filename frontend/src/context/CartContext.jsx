import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

// Use your local backend URL
const API_BASE_URL = "http://localhost:5000/api";

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const isAuthenticated = !!getToken();

  // Fetch cart from backend
  const fetchCart = async () => {
    const token = getToken();
    if (!token) {
      console.log("No token available, skipping cart fetch");
      setCartItems([]);
      setCartCount(0);
      return;
    }

    try {
      setLoading(true);
      console.log("🛒 Fetching cart from API...");
      
      const response = await fetch(`${API_BASE_URL}/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ Cart fetched:", data);
      
      if (data.success) {
        // Your backend returns { success: true, cart: { items: [] } }
        const items = data.cart?.items || [];
        setCartItems(items);
        setCartCount(items.reduce((total, item) => total + item.quantity, 0));
      }
    } catch (error) {
      console.error("❌ Fetch cart error:", error);
      // Fallback to local storage
      const localCart = localStorage.getItem('localCart');
      if (localCart) {
        const items = JSON.parse(localCart);
        setCartItems(items);
        setCartCount(items.reduce((total, item) => total + item.quantity, 0));
      } else {
        setCartItems([]);
        setCartCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addToCart = async (product) => {
    console.log("🛒 Adding to cart:", product);
    
    const token = getToken();
    
    if (!token) {
      alert("Please login to add items to cart");
      return { success: false, error: "Not authenticated" };
    }

    // Prepare product data to match your backend expectations
    const price = typeof product.price === 'string' 
      ? parseFloat(product.price.replace('$', '')) 
      : product.price;

    try {
      console.log("📡 Attempting API add to cart...");
      
      const response = await fetch(`${API_BASE_URL}/cart/add`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // Your backend expects this format
        body: JSON.stringify({
          productId: product.id.toString(),
          name: product.name,
          price: price,
          quantity: 1,
          image: product.image || "/default.jpg"
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Added via API:", data);
        
        if (data.success) {
          const items = data.cart?.items || [];
          setCartItems(items);
          setCartCount(items.reduce((total, item) => total + item.quantity, 0));
          return { success: true, method: 'api' };
        }
      } else {
        console.warn("⚠️ API add failed, status:", response.status);
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("❌ Error adding to cart:", error);
      
      // Fallback to local storage for unauthenticated users or API failure
      console.log("🔄 Using local storage fallback");
      const localCart = JSON.parse(localStorage.getItem('localCart') || '[]');
      
      const existingItemIndex = localCart.findIndex(item => item.productId === product.id.toString());
      
      if (existingItemIndex > -1) {
        localCart[existingItemIndex].quantity += 1;
      } else {
        localCart.push({
          productId: product.id.toString(),
          name: product.name,
          price: price,
          image: product.image || "/default.jpg",
          quantity: 1
        });
      }
      
      localStorage.setItem('localCart', JSON.stringify(localCart));
      setCartItems(localCart);
      setCartCount(localCart.reduce((total, item) => total + item.quantity, 0));
      
      return { success: true, method: 'local' };
    }
  };

  const updateQuantity = async (productId, quantity) => {
    const token = getToken();
    
    try {
      if (token) {
        const response = await fetch(`${API_BASE_URL}/cart/update`, {
          method: "PUT",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            productId: productId.toString(), 
            quantity 
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const items = data.cart?.items || [];
            setCartItems(items);
            setCartCount(items.reduce((total, item) => total + item.quantity, 0));
            return;
          }
        }
      }

      // Fallback to local storage
      const localCart = JSON.parse(localStorage.getItem('localCart') || '[]');
      const updatedCart = localCart.map(item =>
        item.productId === productId.toString() ? { ...item, quantity } : item
      ).filter(item => item.quantity > 0);
      
      localStorage.setItem('localCart', JSON.stringify(updatedCart));
      setCartItems(updatedCart);
      setCartCount(updatedCart.reduce((total, item) => total + item.quantity, 0));
    } catch (error) {
      console.error("Error updating cart:", error);
    }
  };

  const removeFromCart = async (productId) => {
    const token = getToken();
    
    try {
      if (token) {
        const response = await fetch(`${API_BASE_URL}/cart/delete/${productId}`, {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const items = data.cart?.items || [];
            setCartItems(items);
            setCartCount(items.reduce((total, item) => total + item.quantity, 0));
            return;
          }
        }
      }

      // Fallback to local storage
      const localCart = JSON.parse(localStorage.getItem('localCart') || '[]');
      const updatedCart = localCart.filter(item => item.productId !== productId.toString());
      
      localStorage.setItem('localCart', JSON.stringify(updatedCart));
      setCartItems(updatedCart);
      setCartCount(updatedCart.reduce((total, item) => total + item.quantity, 0));
    } catch (error) {
      console.error("Error removing from cart:", error);
    }
  };

  const clearCart = async () => {
    const token = getToken();
    
    try {
      if (token) {
        const response = await fetch(`${API_BASE_URL}/cart/clear`, {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCartItems([]);
            setCartCount(0);
            localStorage.removeItem('localCart');
            return;
          }
        }
      }

      // Fallback to local storage
      localStorage.removeItem('localCart');
      setCartItems([]);
      setCartCount(0);
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const login = (token) => {
    localStorage.setItem("token", token);
    fetchCart(); // Refresh cart after login
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("localCart");
    setCartItems([]);
    setCartCount(0);
  };

  const value = {
    cartItems,
    cartCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    isAuthenticated,
    login,
    logout,
    refreshCart: fetchCart,
    loading
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};