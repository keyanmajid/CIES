// components/EmployeeSatisfactionDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  Users,
  Smile,
  Frown,
  Meh,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Shield,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';

const EmployeeSatisfactionDashboard = ({ employeeId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [mlStatus, setMlStatus] = useState({ status: 'checking' });
  const [refreshing, setRefreshing] = useState(false);
  const [unsatisfiedCustomers, setUnsatisfiedCustomers] = useState([]);
  const [unsatisfiedLoading, setUnsatisfiedLoading] = useState(false);

  const API_BASE = "https://cies-5dc4.onrender.com/api";

  // Function to get employee ID from localStorage if not provided as prop
  const getEmployeeId = () => {
    // If employeeId is provided as prop, use it
    if (employeeId) return employeeId;
    
    // Otherwise try to get from localStorage
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // Check different possible ID fields
        return user.id || user._id || user.userId || user.userID;
      }
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
    }
    
    // Also check for token which might contain user info
    const token = localStorage.getItem('token');
    if (token) {
      console.log("Token exists, but no user found in localStorage");
    }
    
    return null;
  };

  const currentEmployeeId = getEmployeeId();

  useEffect(() => {
    if (currentEmployeeId) {
      console.log("Fetching dashboard for employee:", currentEmployeeId);
      fetchDashboardData();
      checkMLStatus();
    }
  }, [range, activeTab, currentEmployeeId]);

  useEffect(() => {
    if (activeTab === 'unsatisfied' && currentEmployeeId) {
      fetchUnsatisfiedCustomers();
    }
  }, [activeTab, currentEmployeeId]);

  const fetchDashboardData = async () => {
    if (!currentEmployeeId) {
      console.error("No employee ID available");
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log(`Making request to: ${API_BASE}/satisfaction/employee/${currentEmployeeId}/dashboard?range=${range}`);
      console.log("Using token:", token ? "Yes" : "No");
      
      const response = await fetch(
        `${API_BASE}/satisfaction/employee/${currentEmployeeId}/dashboard?range=${range}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDashboardData(data.dashboard);
        } else {
          console.error("Failed to fetch dashboard:", data.message);
        }
      } else {
        console.error("HTTP error:", response.status);
        // Try to read error message if any
        try {
          const errorData = await response.json();
          console.error("Error details:", errorData);
        } catch (e) {
          // Ignore if no JSON error
        }
      }
    } catch (error) {
      console.error('Error fetching satisfaction dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnsatisfiedCustomers = async () => {
    if (!currentEmployeeId) return;
    
    try {
      setUnsatisfiedLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/satisfaction/employee/${currentEmployeeId}/unsatisfied?limit=20`,
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
          setUnsatisfiedCustomers(data.interactions || []);
        }
      }
    } catch (error) {
      console.error('Error fetching unsatisfied customers:', error);
    } finally {
      setUnsatisfiedLoading(false);
    }
  };

  const checkMLStatus = async () => {
    try {
      const response = await fetch('https://keyanmajid-space-ml.hf.space/health');
      if (response.ok) {
        const data = await response.json();
        setMlStatus(data);
      } else {
        setMlStatus({ status: 'disconnected', model_loaded: false });
      }
    } catch (error) {
      setMlStatus({ status: 'disconnected', model_loaded: false });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (currentEmployeeId) {
      fetchDashboardData();
      checkMLStatus();
    } else {
      setRefreshing(false);
    }
  };

  const handleBatchAnalyze = async () => {
    if (!currentEmployeeId) {
      alert("No employee ID found");
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/satisfaction/employee/${currentEmployeeId}/batch-analyze`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ limit: 20 })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(`Batch analysis completed: ${data.analyzed} interactions analyzed`);
          fetchDashboardData();
        }
      } else {
        alert('Failed to start batch analysis');
      }
    } catch (error) {
      console.error('Batch analysis error:', error);
      alert('Batch analysis failed');
    }
  };

  const getSatisfactionColor = (label) => {
    switch (label) {
      case 'satisfied': return '#10B981'; // Green
      case 'neutral': return '#F59E0B'; // Yellow
      case 'dissatisfied': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const getSatisfactionIcon = (label) => {
    switch (label) {
      case 'satisfied': return <Smile className="w-5 h-5" />;
      case 'neutral': return <Meh className="w-5 h-5" />;
      case 'dissatisfied': return <Frown className="w-5 h-5" />;
      default: return <HelpCircle className="w-5 h-5" />;
    }
  };

  // Custom Card Component
  const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {children}
    </div>
  );

  const CardHeader = ({ children, className = '' }) => (
    <div className={`p-6 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );

  const CardTitle = ({ children, className = '' }) => (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );

  const CardDescription = ({ children, className = '' }) => (
    <p className={`text-sm text-gray-500 mt-1 ${className}`}>
      {children}
    </p>
  );

  const CardContent = ({ children, className = '' }) => (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );

  // Custom Tabs Components
  const Tabs = ({ children, value, onValueChange }) => (
    <div className="space-y-4">
      {React.Children.map(children, child => 
        React.cloneElement(child, { activeTab: value, onTabChange: onValueChange })
      )}
    </div>
  );

  const TabsList = ({ children, activeTab, onTabChange }) => (
    <div className="flex space-x-1 border-b border-gray-200">
      {React.Children.map(children, child =>
        React.cloneElement(child, { activeTab, onTabChange })
      )}
    </div>
  );

  const TabsTrigger = ({ children, value, activeTab, onTabChange }) => (
    <button
      className={`px-4 py-3 font-medium text-sm transition-colors ${
        activeTab === value
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
      onClick={() => onTabChange(value)}
    >
      {children}
    </button>
  );

  const TabsContent = ({ children, value, activeTab }) => (
    activeTab === value ? <div>{children}</div> : null
  );

  // Custom Badge Component
  const Badge = ({ children, variant = 'default' }) => {
    const variantClasses = {
      default: 'bg-gray-100 text-gray-800',
      success: 'bg-green-100 text-green-800',
      destructive: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${variantClasses[variant]}`}>
        {children}
      </span>
    );
  };

  // Custom Button Component
  const Button = ({ children, onClick, variant = 'default', disabled = false, className = '', size = 'default' }) => {
    const variantClasses = {
      default: 'bg-blue-600 hover:bg-blue-700 text-white',
      outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
      destructive: 'bg-red-600 hover:bg-red-700 text-white'
    };

    const sizeClasses = {
      default: 'px-4 py-2',
      sm: 'px-3 py-1 text-sm'
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      >
        {children}
      </button>
    );
  };

  if (!currentEmployeeId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Employee ID Required</h3>
          <p className="text-gray-500">Please log in as an employee to view this dashboard</p>
          <p className="text-sm text-gray-400 mt-2">
            Check if user data exists in localStorage
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading satisfaction dashboard...</p>
          <p className="text-sm text-gray-400 mt-2">Employee ID: {currentEmployeeId?.substring(0, 12)}...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
        <p className="text-gray-500 mb-4">Start chatting with customers to see satisfaction data</p>
        <p className="text-sm text-gray-400 mb-4">Employee ID: {currentEmployeeId?.substring(0, 12)}...</p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  const { summary, breakdown, trend, recentAnalysis, feedback } = dashboardData;

  // Prepare chart data with null checks
  const breakdownChartData = [
    { name: 'Satisfied', value: breakdown?.satisfied?.count || 0, color: '#10B981' },
    { name: 'Neutral', value: breakdown?.neutral?.count || 0, color: '#F59E0B' },
    { name: 'Dissatisfied', value: breakdown?.dissatisfied?.count || 0, color: '#EF4444' },
    { name: 'Not Analyzed', value: breakdown?.notAnalyzed?.count || 0, color: '#6B7280' }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Satisfaction Dashboard</h1>
          <p className="text-gray-600">
            Analyzing customer satisfaction from your interactions
          </p>
          <p className="text-sm text-gray-400 mt-1">Employee ID: {currentEmployeeId?.substring(0, 12)}...</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={handleBatchAnalyze}
            variant="default"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Shield className="w-4 h-4 mr-2" />
            Analyze All
          </Button>
        </div>
      </div>

      {/* ML Status */}
      <div className={`p-4 rounded-lg border ${
        mlStatus.model_loaded ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
            {mlStatus.model_loaded ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mr-2" />
            )}
            <div>
              <p className="font-medium">
                ML Satisfaction API: {mlStatus.model_loaded ? 'Connected' : 'Disconnected'}
              </p>
              <p className="text-sm text-gray-600">
                {mlStatus.model_loaded 
                  ? `Accuracy: ${mlStatus.accuracy ? (mlStatus.accuracy * 100).toFixed(1) : 'N/A'}%` 
                  : 'Using fallback sentiment analysis'}
              </p>
            </div>
          </div>
          <Badge variant={mlStatus.model_loaded ? 'success' : 'destructive'}>
            {mlStatus.model_loaded ? 'Active' : 'Offline'}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Interactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{summary?.totalInteractions || 0}</div>
                <p className="text-sm text-gray-500">
                  {summary?.analyzedInteractions || 0} analyzed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Satisfaction Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Smile className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{summary?.satisfactionRate || 0}%</div>
                <p className="text-sm text-gray-500">
                  {breakdown?.satisfied?.count || 0} satisfied customers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Avg Satisfaction Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">
                  {summary?.avgSatisfactionScore || 'N/A'}
                </div>
                <p className="text-sm text-gray-500">
                  Out of 100
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Needs Follow-up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {summary?.needsFollowup || 0}
                </div>
                <p className="text-sm text-gray-500">
                  Dissatisfied customers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Satisfaction Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Satisfaction Distribution</CardTitle>
            <CardDescription>
              Breakdown of customer satisfaction levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {breakdownChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdownChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {breakdownChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [value, 'Customers']}
                      contentStyle={{ borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No data available for chart</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Satisfaction Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Satisfaction Trend</CardTitle>
            <CardDescription>
              Daily satisfaction rate over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {trend && trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666" 
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#666" 
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Satisfaction Rate']}
                      labelFormatter={(label) => `Day: ${label}`}
                      contentStyle={{ borderRadius: '8px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="satisfactionRate"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No trend data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Detailed Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList activeTab={activeTab} onTabChange={setActiveTab}>
          <TabsTrigger value="overview" activeTab={activeTab} onTabChange={setActiveTab}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="recent" activeTab={activeTab} onTabChange={setActiveTab}>
            Recent Analysis
          </TabsTrigger>
          <TabsTrigger value="unsatisfied" activeTab={activeTab} onTabChange={setActiveTab}>
            Needs Follow-up
          </TabsTrigger>
          <TabsTrigger value="feedback" activeTab={activeTab} onTabChange={setActiveTab}>
            Customer Feedback
          </TabsTrigger>
        </TabsList>

        {/* Recent Analysis Tab */}
        <TabsContent value="recent" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Satisfaction Analysis</CardTitle>
              <CardDescription>
                Latest customer satisfaction predictions from your interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentAnalysis && recentAnalysis.length > 0 ? (
                <div className="space-y-3">
                  {recentAnalysis.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                        <div className={`p-2 rounded-full ${
                          item.satisfaction?.label === 'satisfied' ? 'bg-green-100' :
                          item.satisfaction?.label === 'dissatisfied' ? 'bg-red-100' :
                          'bg-yellow-100'
                        }`}>
                          {getSatisfactionIcon(item.satisfaction?.label)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.customerName}</p>
                          <p className="text-sm text-gray-500">
                            {item.type} • {new Date(item.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <Badge
                          className={
                            item.satisfaction?.label === 'satisfied' ? '!bg-green-100 !text-green-800' :
                            item.satisfaction?.label === 'dissatisfied' ? '!bg-red-100 !text-red-800' :
                            '!bg-yellow-100 !text-yellow-800'
                          }
                        >
                          {item.satisfaction?.label || 'Unknown'}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          Score: {item.satisfaction?.score || 'N/A'} • 
                          Conf: {item.satisfaction?.confidence ? (item.satisfaction.confidence * 100).toFixed(0) : '0'}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No satisfaction analysis available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Needs Follow-up Tab */}
        <TabsContent value="unsatisfied" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Customers Needing Follow-up</CardTitle>
              <CardDescription>
                Dissatisfied customers that may require additional attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unsatisfiedLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Loading unsatisfied customers...</p>
                </div>
              ) : unsatisfiedCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                  <p className="text-gray-600">No dissatisfied customers found!</p>
                  <p className="text-sm text-gray-500 mt-1">Great work!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unsatisfiedCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                        <div className="p-2 rounded-full bg-red-100">
                          <Frown className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customer.customerName}</p>
                          <p className="text-sm text-gray-600">
                            {customer.reason} • {customer.messages} messages
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(customer.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">
                          Sentiment: {customer.sentimentScore?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Feedback Tab */}
        <TabsContent value="feedback" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Customer Feedback</CardTitle>
              <CardDescription>
                Direct feedback from customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedback?.total === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No customer feedback yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        Average Rating: {feedback?.averageRating || 'N/A'}/5
                      </p>
                      <p className="text-sm text-gray-500">
                        Total Feedback: {feedback?.total || 0}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {feedback?.latestComments && feedback.latestComments.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                          <div className="flex items-center space-x-2">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-4 h-4 rounded-full ${
                                  i < (item.rating || 0) ? 'bg-yellow-400' : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {item.date ? new Date(item.date).toLocaleDateString() : 'No date'}
                          </span>
                        </div>
                        <p className="text-gray-700">{item.comment || 'No comment provided'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeSatisfactionDashboard;