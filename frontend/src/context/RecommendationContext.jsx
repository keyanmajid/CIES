import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const RecommendationContext = createContext();

const API_BASE_URL = "https://keyanmajid-recomendationml.hf.space";

export const RecommendationProvider = ({ children }) => {
  const [personalizedRecs, setPersonalizedRecs] = useState([]);
  const [forYouRecs, setForYouRecs] = useState([]);
  const [trendingRecs, setTrendingRecs] = useState([]);
  const [loading, setLoading] = useState({
    personalized: false,
    forYou: false,
    trending: false
  });
  const [mlServiceStatus, setMlServiceStatus] = useState('checking');

  // Get authentication token
  const getToken = () => localStorage.getItem("token");
  
  // Get user info from localStorage
  const getUserInfo = () => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Error parsing user info:", error);
      return null;
    }
  };

  // Fetch personalized recommendations
  const fetchPersonalizedRecommendations = useCallback(async (limit = 8) => {
    const token = getToken();
    const userInfo = getUserInfo();
    
    if (!token || !userInfo) {
      console.log("No token or user info available for personalized recommendations");
      setPersonalizedRecs([]);
      return;
    }

    const userId = userInfo._id || userInfo.id;
    if (!userId) {
      console.log("No user ID found for personalized recommendations");
      setPersonalizedRecs([]);
      return;
    }

    setLoading(prev => ({ ...prev, personalized: true }));
    
    try {
      console.log(`[RECOMMENDATIONS] Fetching personalized for user: ${userId}`);
      
      const response = await fetch(
        `${API_BASE_URL}/recommend/personalized`,
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            top_n: limit
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("[RECOMMENDATIONS] Personalized response:", data);
        if (data.success) {
          console.log(`[Frontend] Loaded ${data.recommendations.length} personalized recommendations`);
          setPersonalizedRecs(data.recommendations || []);
        } else {
          console.error("[RECOMMENDATIONS] API returned success=false:", data);
          setPersonalizedRecs([]);
        }
      } else {
        console.error("Failed to fetch personalized recommendations, status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        setPersonalizedRecs([]);
      }
    } catch (error) {
      console.error("Error fetching personalized recommendations:", error);
      setPersonalizedRecs([]);
    } finally {
      setLoading(prev => ({ ...prev, personalized: false }));
    }
  }, []);

  // Fetch "For You" recommendations
  const fetchForYouRecommendations = useCallback(async (limit = 8) => {
    const token = getToken();
    const userInfo = getUserInfo();
    
    setLoading(prev => ({ ...prev, forYou: true }));
    
    try {
      // If user is authenticated, try to get personalized
      if (token && userInfo) {
        const userId = userInfo._id || userInfo.id;
        console.log(`[RECOMMENDATIONS] Fetching for-you (authenticated) for user: ${userId}`);
        
        const response = await fetch(
          `${API_BASE_URL}/recommend/personalized`,
          {
            method: "POST",
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId,
              top_n: limit
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("[RECOMMENDATIONS] For-You (authenticated) response:", data);
          if (data.success) {
            console.log(`[Frontend] Loaded ${data.recommendations.length} for-you recommendations`);
            setForYouRecs(data.recommendations || []);
          } else {
            console.error("[RECOMMENDATIONS] For-You API returned success=false");
            setForYouRecs([]);
          }
        } else {
          console.error("Failed to fetch for-you recommendations");
          setForYouRecs([]);
        }
      } else {
        // For non-authenticated users, use trending
        console.log("[RECOMMENDATIONS] Fetching for-you (guest) - using trending");
        
        try {
          // Try to get trending from main backend
          const response = await fetch(`https://cies-5dc4.onrender.com/api/products?limit=${limit}`);
          if (response.ok) {
            const data = await response.json();
            const products = Array.isArray(data) ? data : (data.products || data.results || []);
            
            // Convert to recommendation format
            const formattedRecs = products.slice(0, limit).map(product => ({
              product_id: product._id,
              name: product.name,
              category: product.category,
              price: product.price,
              imageUrl: product.imageUrl,
              tags: product.tags || [],
              description: product.description || "",
              score: 1.0,
              reason: "Popular choice",
              popularity_score: 1.0,
              purchase_count: 0,
              add_to_cart_count: 0,
              view_count: 0
            }));
            
            setForYouRecs(formattedRecs);
          } else {
            setForYouRecs([]);
          }
        } catch (error) {
          console.error("Error fetching trending for for-you:", error);
          setForYouRecs([]);
        }
      }
    } catch (error) {
      console.error("Error fetching for-you recommendations:", error);
      setForYouRecs([]);
    } finally {
      setLoading(prev => ({ ...prev, forYou: false }));
    }
  }, []);

  // Fetch trending products - EXACTLY 16 for the grid
  const fetchTrendingRecommendations = useCallback(async (limit = 16) => {
    setLoading(prev => ({ ...prev, trending: true }));
    
    try {
      console.log("[RECOMMENDATIONS] Fetching trending recommendations");
      
      // Use main backend products API
      const response = await fetch(`https://cies-5dc4.onrender.com/api/products?limit=${limit}`);
      
      if (response.ok) {
        const data = await response.json();
        const products = Array.isArray(data) ? data : (data.products || data.results || []);
        
        // Convert to recommendation format
        const trendingProducts = products.slice(0, limit).map(product => ({
          product_id: product._id,
          name: product.name,
          category: product.category,
          price: product.price,
          imageUrl: product.imageUrl,
          tags: product.tags || [],
          description: product.description || "",
          score: 1.0,
          reason: "Trending now",
          popularity_score: 1.0,
          purchase_count: 0,
          add_to_cart_count: 0,
          view_count: 0,
          matching_tags: [],
          matching_tags_count: 0
        }));
        
        console.log(`[Frontend] Loaded ${trendingProducts.length} trending recommendations`);
        setTrendingRecs(trendingProducts);
      } else {
        console.error("Failed to fetch trending products from main backend");
        setTrendingRecs([]);
      }
    } catch (error) {
      console.error("Error fetching trending recommendations:", error);
      setTrendingRecs([]);
    } finally {
      setLoading(prev => ({ ...prev, trending: false }));
    }
  }, []);

  // Check ML service status
  const checkMlServiceStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log("[RECOMMENDATIONS] Health check:", data);
        const isHealthy = data.model_loaded && data.mongodb_connected;
        setMlServiceStatus(isHealthy ? 'healthy' : 'unhealthy');
      } else {
        console.error("[RECOMMENDATIONS] Health check failed");
        setMlServiceStatus('unhealthy');
      }
    } catch (error) {
      console.error("[RECOMMENDATIONS] Health check error:", error);
      setMlServiceStatus('unhealthy');
    }
  }, []);

  // Refresh all recommendations
  const refreshAllRecommendations = useCallback(() => {
    const token = getToken();
    const userInfo = getUserInfo();
    console.log("[RECOMMENDATIONS] Refreshing all recommendations, token exists:", !!token, "user exists:", !!userInfo);
    
    if (token && userInfo) {
      fetchPersonalizedRecommendations(8); // 8 for slider
    } else {
      console.log("[RECOMMENDATIONS] No user logged in, skipping personalized");
      setPersonalizedRecs([]);
    }
    fetchForYouRecommendations(8); // 8 for slider
    fetchTrendingRecommendations(16); // 16 for grid
    checkMlServiceStatus();
  }, [fetchPersonalizedRecommendations, fetchForYouRecommendations, fetchTrendingRecommendations, checkMlServiceStatus]);

  // Initial load
  useEffect(() => {
    console.log("[RECOMMENDATIONS] Initial load");
    refreshAllRecommendations();
    
    // Refresh recommendations every 5 minutes
    const interval = setInterval(refreshAllRecommendations, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshAllRecommendations]);

  // Listen for auth changes
  useEffect(() => {
    const handleStorageChange = () => {
      console.log("[RECOMMENDATIONS] Storage changed, refreshing recommendations");
      refreshAllRecommendations();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for login/logout events
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.apply(this, arguments);
      if (key === 'token' || key === 'user') {
        setTimeout(handleStorageChange, 100);
      }
    };

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      localStorage.setItem = originalSetItem;
    };
  }, [refreshAllRecommendations]);

  return (
    <RecommendationContext.Provider value={{
      // Data
      personalizedRecs,
      forYouRecs,
      trendingRecs,
      
      // Loading states
      loading,
      
      // Service status
      mlServiceStatus,
      
      // Methods
      refreshPersonalized: fetchPersonalizedRecommendations,
      refreshForYou: fetchForYouRecommendations,
      refreshTrending: fetchTrendingRecommendations,
      refreshAll: refreshAllRecommendations,
      checkServiceStatus: checkMlServiceStatus
    }}>
      {children}
    </RecommendationContext.Provider>
  );
};

export const useRecommendations = () => {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error("useRecommendations must be used within RecommendationProvider");
  }
  return context;
};