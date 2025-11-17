import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

const API_BASE_URL = "https://cies-5dc4.onrender.com";

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem("token");
  const isAuthenticated = !!getToken();

  // Calculate cart summary
  const calculateCartSummary = (items) => {
    const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = subtotal >= 50 ? 0 : 5.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      shipping: parseFloat(shipping.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      count: items.reduce((total, item) => total + item.quantity, 0)
    };
  };

  const cartSummary = calculateCartSummary(cartItems);

  // Fetch cart from backend
  const fetchCart = async () => {
    const token = getToken();
    
    const localCart = JSON.parse(localStorage.getItem('localCart') || '[]');
    
    if (!token) {
      setCartItems(localCart);
      setCartCount(localCart.reduce((total, item) => total + item.quantity, 0));
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        setCartItems(localCart);
        setCartCount(localCart.reduce((total, item) => total + item.quantity, 0));
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        const items = data.cart?.items || [];
        setCartItems(items);
        setCartCount(items.reduce((total, item) => total + item.quantity, 0));
        
        if (items.length > 0 && localCart.length > 0) {
          localStorage.removeItem('localCart');
        }
      }
    } catch (error) {
      console.error("Fetch cart error:", error);
      setCartItems(localCart);
      setCartCount(localCart.reduce((total, item) => total + item.quantity, 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // Add to cart
  const addToCart = async (product) => {
    if (!product || (!product.id && !product._id)) {
      console.error("Invalid product:", product);
      return { success: false, error: "Invalid product" };
    }

    const token = getToken();
    
    const productId = (product._id || product.id).toString();
    const price = typeof product.price === 'string' 
      ? parseFloat(product.price.replace('$', '')) 
      : product.price || 0;

    const newItems = [...cartItems];
    const existingItemIndex = newItems.findIndex(item => item.productId === productId);
    
    if (existingItemIndex > -1) {
      newItems[existingItemIndex].quantity += 1;
    } else {
      newItems.push({
        productId: productId,
        name: product.name || "Unknown Product",
        price: price,
        quantity: 1,
        image: product.image || product.imageUrl || "/default.jpg"
      });
    }
    
    setCartItems(newItems);
    setCartCount(newItems.reduce((total, item) => total + item.quantity, 0));

    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productId: productId,
            name: product.name || "Unknown Product",
            price: price,
            quantity: 1,
            image: product.image || product.imageUrl || "/default.jpg"
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const items = data.cart?.items || [];
            setCartItems(items);
            setCartCount(items.reduce((total, item) => total + item.quantity, 0));
          }
        }
      } catch (error) {
        console.error("API add to cart failed:", error);
        localStorage.setItem('localCart', JSON.stringify(newItems));
      }
    } else {
      localStorage.setItem('localCart', JSON.stringify(newItems));
    }
    
    return { success: true };
  };

  // Update quantity
  const updateQuantity = async (productId, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    const token = getToken();
    const newItems = cartItems.map(item => 
      item && item.productId === productId.toString() 
        ? { ...item, quantity } 
        : item
    ).filter(item => item && item.quantity > 0);

    setCartItems(newItems);
    setCartCount(newItems.reduce((total, item) => total + item.quantity, 0));

    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cart/update`, {
          method: "PUT",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ productId: productId.toString(), quantity })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.success) {
          const items = data.cart?.items || [];
          setCartItems(items);
          setCartCount(items.reduce((total, item) => total + item.quantity, 0));
        }
      } catch (error) {
        console.error("API update failed:", error);
        localStorage.setItem('localCart', JSON.stringify(newItems));
      }
    } else {
      localStorage.setItem('localCart', JSON.stringify(newItems));
    }
  };

  // Remove from cart
  const removeFromCart = async (productId) => {
    if (!productId) {
      console.error("Invalid productId:", productId);
      return;
    }

    const token = getToken();
    const newItems = cartItems.filter(item => 
      item && item.productId !== productId.toString()
    );
    
    setCartItems(newItems);
    setCartCount(newItems.reduce((total, item) => total + (item?.quantity || 0), 0));

    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cart/delete/${productId.toString()}`, {
          method: "DELETE",
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.error("API delete failed:", error);
        localStorage.setItem('localCart', JSON.stringify(newItems));
      }
    } else {
      localStorage.setItem('localCart', JSON.stringify(newItems));
    }
  };

  // Clear cart
  const clearCart = async () => {
    const token = getToken();
    
    setCartItems([]);
    setCartCount(0);

    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cart/clear`, { 
          method: "DELETE", 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.error("API clear failed:", error);
      }
    }
    
    localStorage.removeItem('localCart');
  };

  // ✅ NEW: Handle checkout
  const handleCheckout = async () => {
    const token = getToken();
    
    if (!token) {
      alert("Please login to checkout");
      return false;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty");
      return false;
    }

    try {
      const totalAmount = cartSummary.total;
      
      const response = await fetch(`${API_BASE_URL}/api/cart/checkout`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ totalAmount })
      });

      if (response.ok) {
        await clearCart();
        return true;
      } else {
        throw new Error('Checkout failed');
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Checkout failed. Please try again.");
      return false;
    }
  };

  const login = (token) => {
    localStorage.setItem("token", token);
    setTimeout(() => fetchCart(), 1000);
  };

  const logout = () => {
    localStorage.removeItem("token");
    const currentCart = cartItems;
    setCartItems(currentCart);
    localStorage.setItem('localCart', JSON.stringify(currentCart));
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      cartSummary,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      handleCheckout, // ✅ ADDED
      isAuthenticated,
      login,
      logout,
      refreshCart: fetchCart,
      loading
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};