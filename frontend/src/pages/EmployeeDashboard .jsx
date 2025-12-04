import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
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
  TrendingUp, // Added for ML Card
  AlertTriangle // Added for ML Card
} from "lucide-react";

// The base URL for the Employee Service (5000) and the Prediction Service (3000/api)
const EMPLOYEE_API_BASE_URL = "https://cies-5dc4.onrender.com/api";
const PREDICTION_API_BASE_URL = "http://localhost:3000/api/prediction";

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
  // State for the company-wide ML status (e.g., customer count/prediction)
  const [customerMlStatus, setCustomerMlStatus] = useState(null); 


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

  const getSentimentDisplay = (sentimentScore) => {
    if (sentimentScore > 0.1) return { text: 'Positive', color: 'text-green-400' };
    if (sentimentScore < -0.1) return { text: 'Negative', color: 'text-red-400' };
    return { text: 'Neutral', color: 'text-yellow-400' };
  };

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

  // Enhanced customer name resolution
  const getCustomerName = useCallback((interaction) => {
    if (interaction.customerName && interaction.customerName.trim() !== '') {
      return interaction.customerName;
    }
    if (interaction.customerId) {
      return `Customer ${interaction.customerId.substring(5, 10)}`;
    }
    return 'Customer';
  }, []);

  // --- Data Fetching Functions ---

  // NEW: Function to fetch the company-wide customer ML status
  const checkCustomerMLStatus = useCallback(async () => {
    try {
      // Calls the Node.js proxy at localhost:3000
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
          setOverviewStats(overviewData.success ? overviewData.stats : getEmptyStats());
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
  
  // New effect to load the ML status once
  useEffect(() => {
    checkCustomerMLStatus();
  }, [checkCustomerMLStatus]);


  // --- Handlers & Component Structure ---

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    checkCustomerMLStatus(); // Refresh ML status too
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const navigationItems = [
    { id: "overview", label: "Dashboard Overview", icon: Activity },
    { id: "analytics", label: "Performance Analytics", icon: BarChart3 },
    { id: "profile", label: "My Profile", icon: User },
    { id: "chat", label: "Chat System", icon: MessageCircle, path: "/chat/employee" },
    { id: "home", label: "Back to Home", icon: Home, path: "/" },
  ];

  // --- NEW: ML Status Card Component ---
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
      <div className={`bg-gray-800 rounded-xl p-6 border-l-4 ${isConnected ? 'border-green-500' : 'border-red-500'}`}>
        <div className="flex items-center mb-2 justify-between">
          <div className="flex items-center">
            <BarChart3 className={`w-5 h-5 mr-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
            <h3 className="text-gray-400 text-sm">Company Customer ML Status</h3>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isConnected ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
              {statusText}
          </span>
        </div>
        <p className="text-xl font-bold text-white mt-2">
            Current Customers: {currentCount.toLocaleString()}
        </p>
        <p className="text-xl font-bold text-white">
            Predicted Next Month: {predictedCount.toLocaleString()}
        </p>
        <p className={`text-sm mt-2 flex items-center ${trendColor}`}>
            <span className="mr-1">{countDifference > 0 ? '+' : ''}{countDifference.toLocaleString()}</span> customers predicted {countDifference > 0 ? 'increase' : 'impact'}
        </p>
      </div>
    );
  };
  // --- END ML Status Card Component ---


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar (Unchanged) */}
      <div className="w-64 bg-gray-800 text-white shadow-lg">
        {/* ... (Sidebar code here) ... */}
        <div className="p-6">
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
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center w-full px-4 py-3 text-gray-300 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-blue-600 text-white" 
                      : "hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-700">
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
        <div className="p-8">
          {/* Header (Unchanged) */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Employee Performance Dashboard</h1>
                <p className="text-gray-400">Welcome back, {employeeData?.name || 'Employee'}</p>
                <p className="text-gray-500 text-sm">Employee ID: {employeeData?.id}</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <select 
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 mt-4">
              <div className="bg-blue-600 px-3 py-1 rounded-full text-sm">
                Score: {overviewStats.currentScore || 100}
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
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards (Including the new ML card) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                {/* Employee Performance Cards */}
                <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-blue-500">
                  <div className="flex items-center mb-2">
                    <Users className="w-5 h-5 text-blue-400 mr-2" />
                    <h3 className="text-gray-400 text-sm">Total Interactions</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{overviewStats.totalInteractions || 0}</p>
                  <p className={`text-sm mt-2 ${
                    overviewStats.completionRate >= 80 ? 'text-green-400' : 
                    overviewStats.completionRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {overviewStats.completionRate || 0}% completion rate
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-green-500">
                  <div className="flex items-center mb-2">
                    <Activity className="w-5 h-5 text-green-400 mr-2" />
                    <h3 className="text-gray-400 text-sm">Avg. Sentiment</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {overviewStats.avgSentiment ? overviewStats.avgSentiment.toFixed(2) : '0.00'}
                  </p>
                  <p className={`text-sm mt-2 ${
                    getSentimentDisplay(overviewStats.avgSentiment || 0).color
                  }`}>
                    {getSentimentDisplay(overviewStats.avgSentiment || 0).text} trend
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center mb-2">
                    <MessageCircle className="w-5 h-5 text-yellow-400 mr-2" />
                    <h3 className="text-gray-400 text-sm">Avg. Response Time</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{overviewStats.avgResponseTime || '0'}s</p>
                  <p className="text-green-400 text-sm mt-2">Within target range</p>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-purple-500">
                  <div className="flex items-center mb-2">
                    <BarChart3 className="w-5 h-5 text-purple-400 mr-2" />
                    <h3 className="text-gray-400 text-sm">Points Impact</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{overviewStats.totalPointsDeducted || 0}</p>
                  <p className="text-green-400 text-sm mt-2">Low impact</p>
                </div>
                
                {/* NEW ML Status Card (occupies the 5th spot) */}
                <MLStatusCard status={customerMlStatus} />

              </div>

              {/* Charts (Unchanged) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Performance Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={overviewStats.performanceTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: 'white' }} />
                      <Legend />
                      <Line type="monotone" dataKey="interactions" stroke="#3B82F6" strokeWidth={2} />
                      <Line type="monotone" dataKey="satisfaction" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Satisfaction Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(overviewStats.satisfactionCounts || {}).map(([key, value]) => ({
                          name: key.charAt(0).toUpperCase() + key.slice(1),
                          value
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(overviewStats.satisfactionCounts || {}).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: 'white' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Interactions (Unchanged logic, utilizing useCallback) */}
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Recent Interactions</h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400 text-sm">
                      Showing {interactions.length} interactions
                    </span>
                    <Link
                      to="/chat/employee"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
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
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-400">Customer</th>
                          <th className="text-left py-3 px-4 text-gray-400">Type</th>
                          <th className="text-left py-3 px-4 text-gray-400">Date</th>
                          <th className="text-left py-3 px-4 text-gray-400">Duration</th>
                          <th className="text-left py-3 px-4 text-gray-400">Status</th>
                          <th className="text-left py-3 px-4 text-gray-400">Sentiment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interactions.map((interaction) => (
                          <tr key={interaction._id} className="border-b border-gray-700 hover:bg-gray-750">
                            <td className="py-3 px-4 text-white">
                              {getCustomerName(interaction)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                interaction.type === 'chat' ? 'bg-blue-500' : 'bg-purple-500'
                              }`}>
                                {interaction.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-300">
                              {new Date(interaction.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-gray-300">{interaction.duration}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                interaction.status === 'completed' ? 'bg-green-500' :
                                interaction.status === 'active' ? 'bg-blue-500' : 'bg-yellow-500'
                              }`}>
                                {interaction.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className={`w-16 h-2 rounded-full ${
                                interaction.sentimentScore > 0.1 ? 'bg-green-500' : 
                                interaction.sentimentScore < -0.1 ? 'bg-red-500' : 'bg-yellow-500'
                              }`} />
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

          {/* Analytics Tab (Unchanged) */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sentiment Analysis */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Sentiment Analysis</h3>
                <ResponsiveContainer width="100%" height={300}>
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

              {/* Weekly Performance */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Weekly Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
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

              {/* Interaction Types */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Interaction Types</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.typeDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(analytics.typeDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: 'white' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Analytics Summary */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Analytics Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Hours:</span>
                    <span className="font-semibold text-white">{analytics.totalAnalytics?.totalHours || 0}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Avg Session Length:</span>
                    <span className="font-semibold text-white">{analytics.totalAnalytics?.avgSessionLength || '0m'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Peak Hours:</span>
                    <span className="font-semibold text-white">{analytics.totalAnalytics?.peakHours || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Busiest Day:</span>
                    <span className="font-semibold text-white">{analytics.totalAnalytics?.busiestDay || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab (Unchanged) */}
          {activeTab === 'profile' && (
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Employee Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-gray-400 mb-4">Personal Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300">Name:</span>
                      <span className="font-semibold text-white">{employeeData?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300">Employee ID:</span>
                      <span className="font-semibold text-white">{employeeData?.id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300">Role:</span>
                      <span className="font-semibold text-white">{employeeData?.role || 'employee'}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300">Current Score:</span>
                      <span className="font-semibold text-white">{overviewStats.currentScore || 100}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-gray-400 mb-4">Performance Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300">Total Interactions:</span>
                      <span className="font-semibold text-white">{overviewStats.totalInteractions || 0}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300">Completion Rate:</span>
                      <span className="font-semibold text-white">{overviewStats.completionRate || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300">Avg. Response Time:</span>
                      <span className="font-semibold text-white">{overviewStats.avgResponseTime || 0}s</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                      <span className="text-gray-300">Points Impact:</span>
                      <span className="font-semibold text-white">{overviewStats.totalPointsDeducted || 0}</span>
                    </div>
                  </div>
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