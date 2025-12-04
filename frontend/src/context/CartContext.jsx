import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const CartContext = createContext();

const API_BASE_URL = "https://cies-5dc4.onrender.com";

// Helper to get and check token status
const getToken = () => localStorage.getItem("token");

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [cartCount, setCartCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
    const [userName, setUserName] = useState("Guest");

    const getUserInfo = useCallback(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                const name = user.name || user.email?.split('@')[0] || "User";
                setUserName(name);
                return { name, role: user.role };
            } catch (error) {
                setUserName("Guest");
                return null;
            }
        }
        setUserName("Guest");
        return null;
    }, []);

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
        setIsAuthenticated(!!getToken());
        getUserInfo();
        fetchCart();
    }, [getUserInfo]);

    // ✅ FIXED: Add to cart with proper activity logging
    const addToCart = async (product) => {
        console.log("[CART DEBUG] Adding product to cart:", product);
        
        if (!product) {
            console.error("[CART] Invalid product:", product);
            return { success: false, error: "Invalid product" };
        }

        // Handle different product ID formats
        const productId = product._id || product.product_id || product.id;
        if (!productId) {
            console.error("[CART] No product ID found:", product);
            return { success: false, error: "No product ID found" };
        }

        const price = typeof product.price === 'string' 
            ? parseFloat(product.price.replace('$', '')) 
            : product.price || 0;

        const token = getToken();
        const newItems = [...cartItems];
        const existingItemIndex = newItems.findIndex(item => item.productId === productId.toString());

        if (existingItemIndex > -1) {
            newItems[existingItemIndex].quantity += 1;
        } else {
            newItems.push({
                productId: productId.toString(),
                name: product.name || "Unknown Product",
                price: price,
                quantity: 1,
                image: product.image || product.imageUrl || "/default.jpg"
            });
        }

        setCartItems(newItems);
        setCartCount(newItems.reduce((total, item) => total + item.quantity, 0));

        // ✅ Log add-to-cart activity AND update cart in database
        if (token && isAuthenticated) {
            try {
                // 1. FIRST: Log the activity to MongoDB with product details
                console.log("[CART] Logging activity for product:", productId);
                const activityResponse = await fetch(`${API_BASE_URL}/api/activities/add-to-cart`, {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        productId: productId,
                        product: {
                            _id: productId,
                            name: product.name,
                            price: price,
                            category: product.category || "Uncategorized",
                            tags: product.tags || [],
                            description: product.description || '',
                            imageUrl: product.image || product.imageUrl || "/default.jpg"
                        }
                    })
                });

                if (!activityResponse.ok) {
                    const errorText = await activityResponse.text();
                    console.error("[ACTIVITY] Failed to log activity:", errorText);
                } else {
                    console.log("[ACTIVITY] Activity logged successfully");
                }

                // 2. THEN: Update cart in MongoDB database
                console.log("[CART] Updating cart in database");
                const cartResponse = await fetch(`${API_BASE_URL}/api/cart/add`, {
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

                if (cartResponse.ok) {
                    const data = await cartResponse.json();
                    console.log("[CART] Cart updated in database:", data);
                    if (data.success) {
                        const items = data.cart?.items || [];
                        setCartItems(items);
                        setCartCount(items.reduce((total, item) => total + item.quantity, 0));
                    }
                } else {
                    const errorText = await cartResponse.text();
                    console.error("[CART] Cart update failed:", errorText);
                    throw new Error(`Cart update failed: ${cartResponse.status}`);
                }
            } catch (error) {
                console.error("API add to cart failed:", error);
                localStorage.setItem('localCart', JSON.stringify(newItems));
            }
        } else {
            console.log("[CART] User not authenticated, saving to local storage");
            localStorage.setItem('localCart', JSON.stringify(newItems));
        }

        return { success: true, productId };
    };

    // ✅ Update quantity
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

    // ✅ Remove from cart
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

    // ✅ Clear cart
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

    // ✅ Handle checkout with activity logging
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
            const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // ✅ Log purchase activities for each item
            const purchaseItems = cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                name: item.name
            }));

            console.log("[CHECKOUT] Logging purchase activities:", purchaseItems);
            
            // First log purchase activities
            const activityResponse = await fetch(`${API_BASE_URL}/api/activities/purchase`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: purchaseItems,
                    orderId: orderId,
                    totalAmount: totalAmount
                })
            });

            if (!activityResponse.ok) {
                console.error("[CHECKOUT] Failed to log purchase activities");
            }

            // Then process checkout
            console.log("[CHECKOUT] Processing checkout");
            const response = await fetch(`${API_BASE_URL}/api/cart/checkout`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ totalAmount, orderId })
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

    const login = (token, user) => {
        localStorage.setItem("token", token);
        
        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
            setUserName(user.name || user.email?.split('@')[0] || "User");
        }
        
        setIsAuthenticated(true);
        fetchCart();
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        
        setIsAuthenticated(false);
        setUserName("Guest");

        const currentCart = cartItems;
        localStorage.setItem('localCart', JSON.stringify(currentCart));
        
        setCartItems(currentCart);
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
            handleCheckout,
            isAuthenticated,
            login,
            logout,
            refreshCart: fetchCart,
            loading,
            userName
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