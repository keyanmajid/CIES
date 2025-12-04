import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const RecommendationContext = createContext();

const API_BASE_URL = "https://cies-5dc4.onrender.com";

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

  // Fetch personalized recommendations
  const fetchPersonalizedRecommendations = useCallback(async (limit = 8) => {
    const token = getToken();
    if (!token) {
      console.log("No token available for personalized recommendations");
      return;
    }

    setLoading(prev => ({ ...prev, personalized: true }));
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/recommendations/personalized?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
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
    setLoading(prev => ({ ...prev, forYou: true }));
    
    try {
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/recommendations/for-you?limit=${limit}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("[RECOMMENDATIONS] For-You response:", data);
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
      const response = await fetch(
        `${API_BASE_URL}/api/recommendations/trending?limit=${limit}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("[RECOMMENDATIONS] Trending response:", data);
        if (data.success) {
          console.log(`[Frontend] Loaded ${data.recommendations.length} trending recommendations`);
          setTrendingRecs(data.recommendations || []);
        } else {
          console.error("[RECOMMENDATIONS] Trending API returned success=false");
          setTrendingRecs([]);
        }
      } else {
        console.error("Failed to fetch trending recommendations");
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
      const response = await fetch(`${API_BASE_URL}/api/recommendations/health`);
      if (response.ok) {
        const data = await response.json();
        console.log("[RECOMMENDATIONS] Health check:", data);
        setMlServiceStatus(data.ml_service_healthy ? 'healthy' : 'unhealthy');
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
    console.log("[RECOMMENDATIONS] Refreshing all recommendations, token exists:", !!token);
    
    if (token) {
      fetchPersonalizedRecommendations(8); // 8 for slider
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