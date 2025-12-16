// frontend/src/pages/EmployeeDashboard.jsx

import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Home, 
  MessageCircle, 
  BarChart3, 
  User, 
  Users,
  Activity,
  RefreshCw,
  LogOut,
  Smile,
  TrendingUp,
  AlertTriangle,
  Bell,
  TrendingDown,
  ShieldAlert,
  Info,
  X,
  Menu,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const EMPLOYEE_API_BASE_URL = "http://localhost:5000/api";

const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [overviewStats, setOverviewStats] = useState({});
  const [interactions, setInteractions] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('week');
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();
  
  // Toxicity Monitoring States
  const [toxicityReport, setToxicityReport] = useState(null);
  const [showToxicityAlert, setShowToxicityAlert] = useState(false);
  const [toxicityAlert, setToxicityAlert] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [realTimeScore, setRealTimeScore] = useState(100);
  const [socket, setSocket] = useState(null);
  const [customerMlStatus, setCustomerMlStatus] = useState(null);
  
  // Responsive sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [collapsed, setCollapsed] = useState(false);

  // --- Helper Functions ---
  const getEmptyStats = () => ({
    currentScore: 100,
    totalInteractions: 0,
    completionRate: 0,
    avgSentiment: 0,
    avgResponseTime: 0,
    totalPointsDeducted: 0,
    performanceTrend: [],
    satisfactionCounts: {}
  });

  

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

  const getCustomerName = useCallback((interaction) => {
    if (interaction.customerName && interaction.customerName.trim() !== '') {
      return interaction.customerName;
    }
    if (interaction.customerId) {
      return `Customer ${interaction.customerId.substring(5, 10)}`;
    }
    return 'Customer';
  }, []);

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // --- Socket.IO Connection for Real-time Updates ---
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData?.id) return;

    // Connect to Socket.IO
    const newSocket = io("http://localhost:5000.com", {
      transports: ["polling", "websocket"],
      query: { userId: userData.id }
    });

    // Listen for score updates from toxicity service
    newSocket.on('scoreUpdate', (data) => {
      console.log('📢 Received score update from toxicity service:', data);
      
      setToxicityAlert({
        type: 'warning',
        title: 'Score Updated',
        message: `Your score has been updated due to chat analysis.`,
        oldScore: data.oldScore,
        newScore: data.newScore,
        pointsDeducted: data.pointsDeducted,
        reason: data.reason,
        timestamp: new Date().toLocaleTimeString()
      });
      
      setShowToxicityAlert(true);
      setRealTimeScore(data.newScore);
      
      // Add to score history
      setScoreHistory(prev => [{
        timestamp: new Date(),
        oldScore: data.oldScore,
        newScore: data.newScore,
        change: -data.pointsDeducted,
        reason: data.reason
      }, ...prev.slice(0, 9)]); // Keep last 10 entries
      
      // Refresh dashboard data after 1 second
      setTimeout(() => {
        fetchDashboardData();
        fetchToxicityReport();
      }, 1000);
    });

    // Listen for toxicity analysis results
    newSocket.on('toxicityAnalysisResult', (data) => {
      console.log('📊 Toxicity analysis result:', data);
      
      setToxicityAlert({
        type: 'info',
        title: 'Chat Analysis Complete',
        message: `Your recent chat was analyzed for toxicity.`,
        pointsDeducted: data.pointsDeducted,
        severity: data.severity,
        timestamp: new Date().toLocaleTimeString()
      });
      
      setShowToxicityAlert(true);
    });

    // Listen for toxicity warnings
    newSocket.on('employeeWarning', (data) => {
      console.log('⚠️ Employee warning received:', data);
      
      setToxicityAlert({
        type: 'alert',
        title: 'Communication Warning',
        message: data.message,
        warning: data.warning,
        timestamp: new Date().toLocaleTimeString()
      });
      
      setShowToxicityAlert(true);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // Close toxicity alert
  const closeToxicityAlert = () => {
    setShowToxicityAlert(false);
  };

  // --- Data Fetching Functions ---
  const checkCustomerMLStatus = useCallback(async () => {
    try {
      const response = await fetch(`${PREDICTION_API_BASE_URL}/customer-status`); 
      const data = await response.json();

      const statusData = {
        success: data.success,
        ml_service: data.ml_service,
        last_month_in_data: data.last_month_in_data || 'N/A',
        data_samples: data.data_samples || 0,
        current_customer_count: data.current_customer_count || 0,
        predicted_customer_count: data.predicted_customer_count || 0,
      };
      setCustomerMlStatus(statusData);
    } catch (error) {
      console.error("Error fetching Customer ML status:", error);
      setCustomerMlStatus({
        success: false,
        ml_service: "Disconnected",
        last_month_in_data: 'N/A',
        data_samples: 0,
        current_customer_count: 0,
        predicted_customer_count: 0,
      });
    }
  }, []);

  const fetchToxicityReport = async () => {
    try {
      const token = localStorage.getItem("token");
      const userData = JSON.parse(localStorage.getItem("user"));
      
      if (!userData?.id) return;

      const response = await fetch(
        `${EMPLOYEE_API_BASE_URL}/employee-toxicity/report/${userData.id}?days=30`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setToxicityReport(data.report);
          console.log('📊 Toxicity report loaded:', data.report);
        }
      }
    } catch (error) {
      console.error("Error fetching toxicity report:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const userData = JSON.parse(localStorage.getItem("user"));
      
      if (!userData || !userData.id) {
        console.error("No user data found");
        setLoading(false);
        return;
      }

      setEmployeeData(userData);
      const employeeId = userData.id;

      console.log("🆔 Fetching dashboard data for employee:", employeeId);

      // Set initial real-time score
      if (overviewStats.currentScore) {
        setRealTimeScore(overviewStats.currentScore);
      }

      // Fetch toxicity report
      fetchToxicityReport();

      // --- Fetch Employee Data (Overview/Interactions) ---
      if (activeTab === 'overview') {
        const [overviewRes, interactionsRes] = await Promise.all([
          fetch(`${EMPLOYEE_API_BASE_URL}/dashboard/overview/${employeeId}?range=${timeRange}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          }),
          fetch(`${EMPLOYEE_API_BASE_URL}/dashboard/interactions/${employeeId}?limit=10`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          })
        ]);

        if (overviewRes.ok) {
          const overviewData = await overviewRes.json();
          const stats = overviewData.success ? overviewData.stats : getEmptyStats();
          setOverviewStats(stats);
          setRealTimeScore(stats.currentScore || 100);
        } else {
          setOverviewStats(getEmptyStats());
        }

        if (interactionsRes.ok) {
          const interactionsData = await interactionsRes.json();
          if (interactionsData.success) {
            setInteractions(interactionsData.interactions);
          } else {
            setInteractions([]);
          }
        } else {
          setInteractions([]);
        }
      }
      
      // --- Fetch Employee Data (Analytics) ---
      if (activeTab === 'analytics') {
        const analyticsRes = await fetch(`${EMPLOYEE_API_BASE_URL}/dashboard/analytics/${employeeId}?range=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          if (analyticsData.success) {
            setAnalytics(analyticsData.analytics);
          }
        }
      }

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // --- Effects ---
  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, activeTab]);
  
  useEffect(() => {
    checkCustomerMLStatus();
  }, [checkCustomerMLStatus]);

  // --- Handlers & Component Structure ---
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    checkCustomerMLStatus();
    fetchToxicityReport();
  };

  const handleLogout = () => {
    if (socket) socket.disconnect();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const navigationItems = [
    { id: "overview", label: "Dashboard Overview", icon: Activity },
    { id: "analytics", label: "Performance Analytics", icon: BarChart3 },
    { id: "profile", label: "My Profile", icon: User },
    { id: "chat", label: "Chat System", icon: MessageCircle, path: "/chat/employee" },
    { id: "home", label: "Back to Home", icon: Home, path: "/" },
    { 
      id: "satisfaction", 
      label: "Customer Satisfaction", 
      icon: Smile, 
      path: "/employee/satisfaction" 
    },
  ];

  // --- ML Status Card Component ---
  const MLStatusCard = ({ status }) => {
    if (!status) return null;

    const isConnected = status.ml_service !== "Disconnected";
    const statusText = status.ml_service || "Fetching...";
    const currentCount = status.current_customer_count || 0;
    const predictedCount = status.predicted_customer_count || 0;
    
    const countDifference = predictedCount - currentCount;
    const trendIcon = countDifference > 0 ? TrendingUp : AlertTriangle;
    const trendColor = countDifference > 0 ? 'text-green-400' : 'text-yellow-400';

    return (
      <div className={`bg-gray-800 rounded-xl p-4 md:p-6 border-l-4 ${isConnected ? 'border-green-500' : 'border-red-500'}`}>
        <div className="flex items-center mb-2 justify-between">
          <div className="flex items-center">
            <BarChart3 className={`w-5 h-5 mr-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
            <h3 className="text-gray-400 text-sm">Company Customer ML Status</h3>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isConnected ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
              {statusText}
          </span>
        </div>
        <p className="text-lg md:text-xl font-bold text-white mt-2">
            Current Customers: {currentCount.toLocaleString()}
        </p>
        <p className="text-lg md:text-xl font-bold text-white">
            Predicted Next Month: {predictedCount.toLocaleString()}
        </p>
        <p className={`text-sm mt-2 flex items-center ${trendColor}`}>
            <span className="mr-1">{countDifference > 0 ? '+' : ''}{countDifference.toLocaleString()}</span> customers predicted {countDifference > 0 ? 'increase' : 'impact'}
        </p>
      </div>
    );
  };

  // --- Toxicity Alert Component ---
  const ToxicityAlert = () => {
    if (!showToxicityAlert || !toxicityAlert) return null;

    const alertConfig = {
      warning: {
        bg: 'bg-yellow-900',
        border: 'border-yellow-700',
        icon: <AlertTriangle className="w-6 h-6 text-yellow-400 mr-3" />,
        titleColor: 'text-yellow-300'
      },
      info: {
        bg: 'bg-blue-900',
        border: 'border-blue-700',
        icon: <Info className="w-6 h-6 text-blue-400 mr-3" />,
        titleColor: 'text-blue-300'
      },
      alert: {
        bg: 'bg-red-900',
        border: 'border-red-700',
        icon: <ShieldAlert className="w-6 h-6 text-red-400 mr-3" />,
        titleColor: 'text-red-300'
      }
    };

    const config = alertConfig[toxicityAlert.type] || alertConfig.info;

    return (
      <div className={`fixed top-4 right-4 z-50 max-w-sm md:max-w-md ${config.bg} ${config.border} border rounded-xl p-4 shadow-2xl animate-slideIn`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            {config.icon}
            <div>
              <h4 className={`font-bold ${config.titleColor}`}>{toxicityAlert.title}</h4>
              <p className="text-sm text-gray-300 mt-1">{toxicityAlert.message}</p>
              
              {toxicityAlert.oldScore !== undefined && (
                <p className="text-sm text-gray-300 mt-1">
                  Score: <span className="line-through text-gray-400">{toxicityAlert.oldScore}</span> → 
                  <span className={`ml-1 ${toxicityAlert.newScore < toxicityAlert.oldScore ? 'text-red-400' : 'text-green-400'}`}>
                    {toxicityAlert.newScore}
                  </span>
                </p>
              )}
              
              {toxicityAlert.pointsDeducted > 0 && (
                <p className="text-sm text-red-300 mt-1">
                  ⚠️ Points deducted: {toxicityAlert.pointsDeducted}
                </p>
              )}
              
              {toxicityAlert.reason && (
                <p className="text-xs text-gray-400 mt-1">Reason: {toxicityAlert.reason}</p>
              )}
              
              {toxicityAlert.warning && (
                <p className="text-xs text-yellow-400 mt-1">⚠️ {toxicityAlert.warning}</p>
              )}
              
              <p className="text-xs text-gray-500 mt-2">{toxicityAlert.timestamp}</p>
            </div>
          </div>
          <button 
            onClick={closeToxicityAlert}
            className="text-gray-400 hover:text-white ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* Toxicity Alert */}
      <ToxicityAlert />

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        id="sidebar"
        className={`
          fixed lg:relative z-50 h-full transition-all duration-300 ease-in-out
          ${isMobile 
            ? `${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
            : `${collapsed ? 'w-20' : 'w-64'}`
          }
          bg-gray-800 text-white shadow-lg
        `}
      >
        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 bg-gray-800 text-white p-1 rounded-full border border-gray-700 z-10"
        >
          {isMobile ? (
            <ChevronLeft className="w-4 h-4" />
          ) : collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        <div className={`p-6 ${collapsed && !isMobile ? 'hidden' : 'block'}`}>
          <h1 className="text-2xl font-bold text-white">Employee Portal</h1>
          <p className="text-gray-400 text-sm mt-2">Performance Dashboard</p>
        </div>
        
        <nav className="mt-6">
          <div className="px-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path ? location.pathname === item.path : activeTab === item.id;
              
              return item.path ? (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-gray-300 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-blue-600 text-white" 
                      : "hover:bg-gray-700 hover:text-white"
                  } ${collapsed && !isMobile ? 'justify-center' : ''}`}
                  onClick={() => isMobile && setSidebarOpen(false)}
                >
                  <Icon className={`w-5 h-5 ${collapsed && !isMobile ? '' : 'mr-3'}`} />
                  {(!collapsed || isMobile) && item.label}
                </Link>
              ) : (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    isMobile && setSidebarOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-3 text-gray-300 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-blue-600 text-white" 
                      : "hover:bg-gray-700 hover:text-white"
                  } ${collapsed && !isMobile ? 'justify-center' : ''}`}
                >
                  <Icon className={`w-5 h-5 ${collapsed && !isMobile ? '' : 'mr-3'}`} />
                  {(!collapsed || isMobile) && item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className={`absolute bottom-0 w-full p-4 border-t border-gray-700 ${collapsed && !isMobile ? 'hidden' : 'block'}`}>
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">{employeeData?.name || 'Employee'}</p>
              <p className="text-xs text-gray-400">{employeeData?.role || 'employee'}</p>
              <p className="text-xs text-gray-500">ID: {employeeData?.id?.substring(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Navigation Bar with Hamburger */}
        <div className="sticky top-0 z-30 bg-gray-800 border-b border-gray-700 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button
              id="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              className="text-white p-2 rounded-lg hover:bg-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-white">Employee Dashboard</h1>
            <div className="w-10"></div> {/* Spacer for alignment */}
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Employee Performance Dashboard</h1>
                <p className="text-gray-400">Welcome back, {employeeData?.name || 'Employee'}</p>
                <p className="text-gray-500 text-sm">Employee ID: {employeeData?.id}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Real-time Score Display */}
                <div className={`text-xl md:text-2xl font-bold px-4 py-2 rounded-lg transition-all duration-500 ${
                  realTimeScore >= 80 ? 'bg-green-900 text-green-300 border border-green-700' :
                  realTimeScore >= 50 ? 'bg-yellow-900 text-yellow-300 border border-yellow-700' :
                  'bg-red-900 text-red-300 border border-red-700'
                }`}>
                  <div className="flex items-center">
                    <span>Score: {realTimeScore}</span>
                    {scoreHistory.length > 0 && scoreHistory[0].change < 0 && (
                      <span className="text-sm ml-2 text-red-400 flex items-center">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        {scoreHistory[0].change}
                      </span>
                    )}
                    {scoreHistory.length > 0 && scoreHistory[0].change > 0 && (
                      <span className="text-sm ml-2 text-green-400 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        +{scoreHistory[0].change}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white hover:bg-gray-700 transition-colors text-sm md:text-base"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <select 
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm md:text-base"
                  >
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <div className={`px-3 py-1 rounded-full text-sm ${
                realTimeScore >= 80 ? 'bg-green-600' :
                realTimeScore >= 50 ? 'bg-yellow-600' : 'bg-red-600'
              }`}>
                Score: {realTimeScore}
              </div>
              <div className="bg-green-600 px-3 py-1 rounded-full text-sm">
                {employeeData?.role || 'employee'}
              </div>
              <div className="bg-purple-600 px-3 py-1 rounded-full text-sm">
                {overviewStats.totalInteractions || 0} Total Interactions
              </div>
              <div className="bg-orange-600 px-3 py-1 rounded-full text-sm">
                {overviewStats.completedInteractions || 0} Completed
              </div>
              {toxicityReport?.totalPointsDeducted > 0 && (
                <div className="bg-red-600 px-3 py-1 rounded-full text-sm flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  -{toxicityReport.totalPointsDeducted} Points
                </div>
              )}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                {/* Employee Performance Cards */}
                <div className="bg-gray-800 rounded-xl p-4 md:p-6 border-l-4 border-blue-500">
                  <div className="flex items-center mb-2">
                    <Users className="w-5 h-5 text-blue-400 mr-2" />
                    <h3 className="text-gray-400 text-sm">Total Interactions</h3>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white">{overviewStats.totalInteractions || 0}</p>
                  <p className={`text-sm mt-2 ${
                    overviewStats.completionRate >= 80 ? 'text-green-400' : 
                    overviewStats.completionRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {overviewStats.completionRate || 0}% completion rate
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-4 md:p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center mb-2">
                    <MessageCircle className="w-5 h-5 text-yellow-400 mr-2" />
                    <h3 className="text-gray-400 text-sm">Avg. Response Time</h3>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white">{overviewStats.avgResponseTime || '0'}s</p>
                  <p className="text-green-400 text-sm mt-2">Within target range</p>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-4 md:p-6 border-l-4 border-purple-500">
                  <div className="flex items-center mb-2">
                    <BarChart3 className="w-5 h-5 text-purple-400 mr-2" />
                    <h3 className="text-gray-400 text-sm">Points Impact</h3>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white">{overviewStats.totalPointsDeducted || 0}</p>
                  <p className={`text-sm mt-2 ${
                    overviewStats.totalPointsDeducted === 0 ? 'text-green-400' : 
                    overviewStats.totalPointsDeducted <= 10 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {overviewStats.totalPointsDeducted === 0 ? 'No impact' : 
                     overviewStats.totalPointsDeducted <= 10 ? 'Low impact' : 'High impact'}
                  </p>
                </div>
              </div>

              {/* Charts and Additional Sections */}
              <div className="grid grid-cols-1 gap-6 mb-6 md:mb-8">
                {/* Performance Trend Chart */}
                <div className="bg-gray-800 rounded-xl p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Performance Trend</h3>
                  <div className="h-64 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overviewStats.performanceTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: 'white' }} />
                        <Legend />
                        <Line type="monotone" dataKey="interactions" stroke="#3B82F6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Interactions */}
              <div className="bg-gray-800 rounded-xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <h3 className="text-lg font-semibold text-white">Recent Interactions</h3>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <span className="text-gray-400 text-sm">
                      Showing {interactions.length} interactions
                    </span>
                    <Link
                      to="/chat/employee"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center text-sm md:text-base"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Go to Chat
                    </Link>
                  </div>
                </div>
                
                {interactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p>No interactions found for this employee.</p>
                    <Link
                      to="/chat/employee"
                      className="text-blue-400 hover:text-blue-300 mt-2 inline-block"
                    >
                      Start your first chat session
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-2 md:px-4 text-gray-400 text-sm">Customer</th>
                          <th className="text-left py-3 px-2 md:px-4 text-gray-400 text-sm">Type</th>
                          <th className="text-left py-3 px-2 md:px-4 text-gray-400 text-sm">Date</th>
                          <th className="text-left py-3 px-2 md:px-4 text-gray-400 text-sm">Duration</th>
                          <th className="text-left py-3 px-2 md:px-4 text-gray-400 text-sm">Status</th>
                            </tr>
                      </thead>
                      <tbody>
                        {interactions.map((interaction) => (
                          <tr key={interaction._id} className="border-b border-gray-700 hover:bg-gray-750">
                            <td className="py-3 px-2 md:px-4 text-white text-sm">
                              {getCustomerName(interaction)}
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                interaction.type === 'chat' ? 'bg-blue-500' : 'bg-purple-500'
                              }`}>
                                {interaction.type}
                              </span>
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-300 text-sm">
                              {new Date(interaction.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-2 md:px-4 text-gray-300 text-sm">{interaction.duration || 'N/A'}</td>
                            <td className="py-3 px-2 md:px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                interaction.status === 'completed' ? 'bg-green-500' :
                                interaction.status === 'active' ? 'bg-blue-500' : 'bg-yellow-500'
                              }`}>
                                {interaction.status}
                              </span>
                            </td>
                            
                           
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Sentiment Analysis */}
              <div className="bg-gray-800 rounded-xl p-4 md:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Sentiment Analysis</h3>
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.sentimentData || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(analytics.sentimentData || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: 'white' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekly Performance */}
              <div className="bg-gray-800 rounded-xl p-4 md:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Weekly Performance</h3>
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.weeklyPerformance || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="week" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: 'white' }} />
                      <Legend />
                      <Bar dataKey="interactions" fill="#3B82F6" />
                      <Bar dataKey="satisfaction" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Toxicity Trend */}
              <div className="bg-gray-800 rounded-xl p-4 md:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Toxicity Trend</h3>
                <div className="h-64 md:h-80">
                  {toxicityReport?.interactions && toxicityReport.interactions.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={toxicityReport.interactions.slice(0, 7).map(i => ({
                        date: new Date(i.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        toxicityScore: i.toxicityScore,
                        pointsDeducted: i.pointsDeducted
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: 'white' }} />
                        <Legend />
                        <Line type="monotone" dataKey="toxicityScore" stroke="#EF4444" strokeWidth={2} />
                        <Line type="monotone" dataKey="pointsDeducted" stroke="#F59E0B" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No toxicity data available for trend analysis
                    </div>
                  )}
                </div>
              </div>

              {/* Analytics Summary */}
              <div className="bg-gray-800 rounded-xl p-4 md:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Analytics Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm md:text-base">Total Hours:</span>
                    <span className="font-semibold text-white">{analytics.totalAnalytics?.totalHours || 0}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm md:text-base">Avg Session Length:</span>
                    <span className="font-semibold text-white">{analytics.totalAnalytics?.avgSessionLength || '0m'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm md:text-base">Peak Hours:</span>
                    <span className="font-semibold text-white">{analytics.totalAnalytics?.peakHours || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm md:text-base">Busiest Day:</span>
                    <span className="font-semibold text-white">{analytics.totalAnalytics?.busiestDay || 'N/A'}</span>
                  </div>
                  {toxicityReport && (
                    <>
                      <div className="border-t border-gray-700 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm md:text-base">Toxic Interactions:</span>
                          <span className="font-semibold text-red-400">{toxicityReport.toxicInteractions || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm md:text-base">Avg Toxicity Score:</span>
                          <span className="font-semibold text-white">
                            {toxicityReport.averageToxicityScore ? toxicityReport.averageToxicityScore.toFixed(3) : '0.000'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-gray-800 rounded-xl p-4 md:p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Employee Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-gray-400 mb-4">Personal Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300 text-sm md:text-base">Name:</span>
                      <span className="font-semibold text-white">{employeeData?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300 text-sm md:text-base">Employee ID:</span>
                      <span className="font-semibold text-white">{employeeData?.id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300 text-sm md:text-base">Role:</span>
                      <span className="font-semibold text-white">{employeeData?.role || 'employee'}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300 text-sm md:text-base">Current Score:</span>
                      <span className={`font-semibold ${
                        realTimeScore >= 80 ? 'text-green-400' :
                        realTimeScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {realTimeScore}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-gray-400 mb-4">Performance Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300 text-sm md:text-base">Total Interactions:</span>
                      <span className="font-semibold text-white">{overviewStats.totalInteractions || 0}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300 text-sm md:text-base">Completion Rate:</span>
                      <span className="font-semibold text-white">{overviewStats.completionRate || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300 text-sm md:text-base">Avg. Response Time:</span>
                      <span className="font-semibold text-white">{overviewStats.avgResponseTime || 0}s</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300 text-sm md:text-base">Points Deducted:</span>
                      <span className="font-semibold text-red-400">-{toxicityReport?.totalPointsDeducted || 0}</span>
                    </div>
                  </div>
                  
                  {/* Toxicity Score Card in Profile */}
                  {toxicityReport && (
                    <div className="mt-6 bg-gray-900 rounded-lg p-4">
                      <h5 className="text-gray-400 text-sm mb-2">Toxicity Metrics</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Toxic Interactions</p>
                          <p className="text-lg font-bold text-white">{toxicityReport.toxicInteractions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Avg Toxicity</p>
                          <p className="text-lg font-bold text-white">
                            {toxicityReport.averageToxicityScore?.toFixed(3) || '0.000'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;