import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User, Brain, TrendingUp, BarChart3, Menu, RefreshCw, Users, UserPlus, Home, Settings, LogOut, Briefcase, UserCheck } from "lucide-react";
import ReactApexChart from "react-apexcharts";
import { useNavigate, useLocation, Link } from "react-router-dom"; // Added Link import

export default function Dashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profitMlStatus, setProfitMlStatus] = useState(null);
    const [customerMlStatus, setCustomerMlStatus] = useState(null);
    const [profitRecords, setProfitRecords] = useState([]);
    const [tomorrowPrediction, setTomorrowPrediction] = useState(null);
    const [customerPrediction, setCustomerPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [chartType, setChartType] = useState("comparison");
    const [refreshing, setRefreshing] = useState(false);
    const [currentCustomerCount, setCurrentCustomerCount] = useState(null);
    const [userRole, setUserRole] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    // Check user role and authentication
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        
        if (!token) {
            alert("Please login first");
            navigate("/login");
            return;
        }

        if (userData) {
            try {
                const user = JSON.parse(userData);
                setUserRole(user.role);
                
                // Only managers should access this dashboard
                if (user.role !== "manager") {
                    alert("Only managers can access this dashboard");
                    navigate("/care");
                    return;
                }
            } catch (error) {
                console.error("Error parsing user data:", error);
                navigate("/login");
            }
        }
    }, [navigate]);

    // Check ML Service Status
    const checkProfitMLStatus = useCallback(async () => {
        try {
            const res = await fetch("https://cies-5dc4.onrender.com/api/prediction/ml-status");
            const data = await res.json();
            setProfitMlStatus(data);
        } catch (error) {
            console.error("ML Status error:", error);
            setProfitMlStatus({
                success: false,
                ml_service: "Disconnected",
                error: error.message,
            });
        }
    }, []);

    const checkCustomerMLStatus = useCallback(async () => {
        try {
            const res = await fetch("https://cies-5dc4.onrender.com/api/prediction/customer-status");
            const data = await res.json();
            setCustomerMlStatus(data);
        } catch (error) {
            console.error("Customer ML Status error:", error);
            setCustomerMlStatus({
                success: false,
                ml_service: "Disconnected",
                error: error.message,
            });
        }
    }, []);

    const fetchCurrentCustomerCount = useCallback(async () => {
        try {
            const res = await fetch("https://cies-5dc4.onrender.com/api/prediction/current-customer-count-only");
            const data = await res.json();
            if (data.success) {
                setCurrentCustomerCount(data.current_customer_count);
            }
        } catch (error) {
            console.error("Error fetching customer count:", error);
            setCurrentCustomerCount(0);
        }
    }, []);

    const fetchProfitChartData = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetch("https://cies-5dc4.onrender.com/api/prediction/sales/data?limit=30");
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            if (data.success && data.records) {
                const sorted = data.records.sort((a, b) => new Date(a.date) - new Date(b.date));
                setProfitRecords(sorted);
            } else {
                console.error("Failed to fetch sales data:", data.error);
            }
        } catch (error) {
            console.error("Error fetching sales data:", error);
            alert("Error loading sales data: " + error.message);
        } finally {
            setRefreshing(false);
        }
    }, []);

    const getTomorrowPrediction = async () => {
        try {
            const res = await fetch("https://cies-5dc4.onrender.com/api/prediction/predict-tomorrow");
            const data = await res.json();
            if (data.success) {
                setTomorrowPrediction(data.prediction);
                setTimeout(() => fetchProfitChartData(), 500);
            } else {
                alert("Prediction failed: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Error generating prediction:", error);
            alert("❌ Error generating prediction. Make sure ML service is running.");
        }
    };

    const getCustomerPrediction = async () => {
        try {
            const res = await fetch("https://cies-5dc4.onrender.com/api/prediction/predict-customers", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ months: 1 })
            });
            const data = await res.json();
            if (data.success) {
                setCustomerPrediction(data.prediction);
                await fetchCurrentCustomerCount();
            } else {
                alert("Customer prediction failed: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Error generating customer prediction:", error);
            alert("❌ Error generating customer prediction. Make sure Customer ML service is running.");
        }
    };

    const generatePredictions = async () => {
        setLoading(true);
        await getTomorrowPrediction();
        await getCustomerPrediction();
        setLoading(false);
    };

    const addSampleSalesData = async () => {
        const sampleDate = new Date();
        sampleDate.setDate(sampleDate.getDate() - Math.floor(Math.random() * 30));
        
        const sample = {
            date: sampleDate.toISOString(),
            totalSales: Math.random() * 2000 + 500,
        };
        
        try {
            const res = await fetch("https://cies-5dc4.onrender.com/api/prediction/sales/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sample),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`✅ Added sample: $${data.record.totalSales.toFixed(2)}`);
                await fetchProfitChartData();
            } else {
                alert(`❌ Failed: ${data.error}`);
            }
        } catch (error) {
            console.error("Error adding sample:", error);
            alert("❌ Error adding sample sales data");
        }
    };

    const addSampleCustomerData = async () => {
        const sampleDate = new Date();
        sampleDate.setDate(sampleDate.getDate() - Math.floor(Math.random() * 7));
        
        const sample = {
            date: sampleDate.toISOString(),
            customerCount: Math.floor(Math.random() * 500) + 800,
        };
        
        try {
            const res = await fetch("https://cies-5dc4.onrender.com/api/prediction/add-customer-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sample),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`✅ Added sample: ${data.record.customerCount} customers`);
                await fetchCurrentCustomerCount();
                await checkCustomerMLStatus();
            } else {
                alert(`❌ Failed: ${data.error}`);
            }
        } catch (error) {
            console.error("Error adding customer sample:", error);
            alert("❌ Error adding sample customer data");
        }
    };

    // Navigation functions
    const navigateToEmployees = () => {
        navigate("/manager/employees");
    };

    const navigateToAddEmployee = () => {
        navigate("/EmployeeSignup");
    };

    const navigateToDashboard = () => {
        navigate("/care");
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    useEffect(() => {
        checkProfitMLStatus();
        checkCustomerMLStatus();
        fetchProfitChartData();
        fetchCurrentCustomerCount();
    }, [checkProfitMLStatus, checkCustomerMLStatus, fetchProfitChartData, fetchCurrentCustomerCount]);

    const { chartSeries, chartOptions } = useMemo(() => {
        if (!profitRecords.length) {
            return {
                chartSeries: [],
                chartOptions: {
                    chart: { type: 'line', background: 'transparent' },
                    noData: { text: 'Loading data...' }
                }
            };
        }

        const displayRecords = profitRecords.slice(-15);
        
        const categories = displayRecords.map(record => 
            new Date(record.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            })
        );

        const actualData = displayRecords.map(record => record.totalSales || null);
        const predictedData = displayRecords.map(record => record.predictedSales || null);

        const series = [
            {
                name: "Actual Sales",
                type: chartType === "comparison" ? "line" : "column",
                data: actualData,
                color: "#10B981"
            },
            {
                name: "Predicted Sales", 
                type: chartType === "comparison" ? "line" : "column",
                data: predictedData,
                color: "#F59E0B"
            }
        ];

        const options = {
            chart: {
                type: 'line',
                height: 350,
                background: "transparent",
                toolbar: {
                    show: true,
                    tools: {
                        download: true,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800
                },
                foreColor: '#AAA'
            },
            stroke: {
                curve: 'smooth',
                width: chartType === "comparison" ? 3 : 0
            },
            fill: {
                opacity: chartType === "comparison" ? 0 : 0.8
            },
            markers: {
                size: chartType === "comparison" ? 4 : 0,
                hover: {
                    size: 6
                }
            },
            xaxis: {
                categories: categories,
                labels: {
                    style: {
                        colors: '#AAA'
                    }
                },
                axisBorder: {
                    show: true,
                    color: '#333'
                },
                axisTicks: {
                    show: true,
                    color: '#333'
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#AAA'
                    },
                    formatter: (value) => `$${value ? value.toFixed(0) : 0}`
                },
                title: {
                    text: 'Sales ($)',
                    style: {
                        color: '#AAA'
                    }
                }
            },
            grid: {
                borderColor: '#333',
                strokeDashArray: 4,
                padding: {
                    top: 0,
                    right: 10,
                    bottom: 0,
                    left: 10
                }
            },
            tooltip: {
                theme: 'dark',
                shared: true,
                intersect: false,
                y: {
                    formatter: (value) => `$${value ? value.toFixed(2) : 'N/A'}`
                }
            },
            legend: {
                labels: {
                    colors: '#FFF'
                },
                position: 'top'
            },
            dataLabels: {
                enabled: false
            }
        };

        return { chartSeries: series, chartOptions: options };
    }, [profitRecords, chartType]);

    const accuracyMetrics = useMemo(() => {
        const validRecords = profitRecords.filter(record => 
            record.totalSales && record.predictedSales && record.totalSales > 0
        );
        
        if (!validRecords.length) return null;

        const accuracies = validRecords.map(record => {
            const error = Math.abs(record.predictedSales - record.totalSales) / record.totalSales;
            return (1 - error) * 100;
        });

        return {
            avg: (accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length).toFixed(1),
            best: Math.max(...accuracies).toFixed(1),
            worst: Math.min(...accuracies).toFixed(1),
            count: validRecords.length
        };
    }, [profitRecords]);

    const MLStatusPanel = ({ status, title, serviceType = "profit" }) => (
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
                <Brain size={20} className="text-[#A78BFA]" /> {title}
            </h3>
            {status ? (
                <div className={`p-4 rounded-lg ${status.success ? "bg-green-500/20 border-green-500" : "bg-red-500/20 border-red-500"} border`}>
                    <p className="font-semibold text-white">Service: {status.ml_service}</p>
                    {serviceType === "customer" && status.current_customer_count !== undefined && (
                        <p className="text-green-300 text-sm mt-1">
                            Current Customers: {status.current_customer_count.toLocaleString()}
                        </p>
                    )}
                    {status.ml_info && (
                        <p className="text-green-300 text-sm mt-1">{status.ml_info.message}</p>
                    )}
                    {status.error && <p className="text-red-300 mt-1">Error: {status.error}</p>}
                </div>
            ) : (
                <p className="text-gray-400">Checking status...</p>
            )}
            <button 
                onClick={serviceType === "profit" ? checkProfitMLStatus : checkCustomerMLStatus} 
                className="mt-2 text-[#A78BFA] hover:text-[#8B5CF6] flex items-center gap-1"
            >
                <RefreshCw size={14} /> Re-check Status
            </button>
        </div>
    );

    const CustomerDataCard = ({ icon: Icon, title, value, colorClass }) => (
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg flex flex-col items-start justify-center transition-all hover:shadow-[0_0_25px_#7C3AED]/30">
            <div className={`p-3 rounded-full ${colorClass} mb-4`}>
                <Icon size={24} className="text-white" />
            </div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <h4 className="text-3xl font-bold text-white mt-1">
                {value != null ? value.toLocaleString() : 'Loading...'}
            </h4>
        </div>
    );

    const TomorrowPredictionCard = () => (
        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-6 rounded-2xl shadow-lg border border-purple-500/30">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                <TrendingUp size={20}/> Tomorrow's Sales Prediction
            </h3>
            {tomorrowPrediction ? (
                <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                        ${tomorrowPrediction.predictedSales?.toFixed(2) || '0.00'}
                    </div>
                    <p className="text-gray-300 text-sm">
                        {new Date(tomorrowPrediction.date).toLocaleDateString()}
                    </p>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-gray-300 mb-3">No prediction generated yet</p>
                    <button 
                        onClick={getTomorrowPrediction} 
                        disabled={loading}
                        className="bg-[#7C3AED] px-4 py-2 rounded-lg text-white hover:bg-[#8B5CF6] disabled:opacity-50"
                    >
                        {loading ? "Generating..." : "Generate Prediction"}
                    </button>
                </div>
            )}
        </div>
    );

    const CustomerPredictionCard = () => (
        <div className="bg-gradient-to-br from-green-600/20 to-blue-600/20 p-6 rounded-2xl shadow-lg border border-green-500/30">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                <UserPlus size={20}/> Customer Prediction
            </h3>
            {customerPrediction ? (
                <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                        {customerPrediction.predicted_customer_count?.toLocaleString() || '0'}
                    </div>
                    <p className="text-gray-300 text-sm">
                        {new Date(customerPrediction.date).toLocaleDateString()}
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                        Based on {customerPrediction.based_on_last_days || 0} days of data
                    </p>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-gray-300 mb-3">No customer prediction yet</p>
                    <button 
                        onClick={getCustomerPrediction} 
                        disabled={loading}
                        className="bg-[#7C3AED] px-4 py-2 rounded-lg text-white hover:bg-[#8B5CF6] disabled:opacity-50"
                    >
                        {loading ? "Generating..." : "Predict Customers"}
                    </button>
                </div>
            )}
        </div>
    );

    const AccuracyMetricsCard = () => (
        <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 p-6 rounded-2xl shadow-lg border border-blue-500/30">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                <BarChart3 size={20}/> Prediction Accuracy
            </h3>
            {accuracyMetrics ? (
                <div className="space-y-2 text-center">
                    <p className="text-2xl font-bold text-white">{accuracyMetrics.avg}%</p>
                    <p className="text-gray-300 text-sm">Average Accuracy</p>
                    <div className="flex justify-between text-xs mt-3">
                        <div>
                            <p className="text-green-400 font-semibold">{accuracyMetrics.best}%</p>
                            <p className="text-gray-400">Best</p>
                        </div>
                        <div>
                            <p className="text-red-400 font-semibold">{accuracyMetrics.worst}%</p>
                            <p className="text-gray-400">Worst</p>
                        </div>
                        <div>
                            <p className="text-blue-400 font-semibold">{accuracyMetrics.count}</p>
                            <p className="text-gray-400">Samples</p>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-gray-400 text-center">No accuracy data available<br/>Need both actual and predicted values</p>
            )}
        </div>
    );

    return (
        <div className="flex h-screen bg-[#0F0F12] font-sans text-gray-100">
            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full w-72 bg-[#141419]/80 backdrop-blur-lg z-50 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                <div className="flex flex-col h-full p-6">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-[#7C3AED] rounded-lg">
                            <Briefcase size={24} className="text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-white">CustomerCare Pro</h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        <button
                            onClick={navigateToDashboard}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                                location.pathname === "/care" 
                                    ? "bg-[#7C3AED] text-white shadow-lg" 
                                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            <Home size={20} />
                            <span className="font-medium">Dashboard</span>
                        </button>
                        <button
                            onClick={navigateToEmployees}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                                location.pathname === "/manager/employees" 
                                    ? "bg-[#7C3AED] text-white shadow-lg" 
                                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            <UserCheck size={20} />
                            <span className="font-medium">All Employees</span>
                        </button>
                        <button
                            onClick={navigateToAddEmployee}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                                location.pathname === "/EmployeeSignup" 
                                    ? "bg-[#7C3AED] text-white shadow-lg" 
                                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            <UserPlus size={20} />
                            <span className="font-medium">Add Employee</span>
                        </button>
                        <button
                            onClick={() => alert("Settings coming soon!")}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                        >
                            <Settings size={20} />
                            <span className="font-medium">Settings</span>
                        </button>
                    </nav>

                    {/* User Section */}
                    <div className="pt-6 border-t border-gray-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#7C3AED] rounded-full flex items-center justify-center">
                                <User size={20} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">Manager</p>
                                <p className="text-gray-400 text-sm truncate">Admin Access</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                        >
                            <LogOut size={20} />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:ml-72">
                {/* Mobile Header */}
                <div className="p-4 lg:hidden flex items-center justify-between bg-[#0F0F12] border-b border-gray-800">
                    <h2 className="text-2xl font-bold text-white">AI Dashboard</h2>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <Menu size={28} className="text-[#A78BFA]" />
                    </button>
                </div>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
                    {/* Header Controls */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                        <h2 className="text-3xl font-bold text-white">AI-Powered Sales & Customer Dashboard</h2>
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={generatePredictions} 
                                disabled={loading || !profitMlStatus?.success}
                                className="bg-[#7C3AED] px-4 py-2 rounded-lg text-white hover:bg-[#8B5CF6] shadow-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? "Generating..." : "AI Predictions"}
                            </button>
                            <button 
                                onClick={addSampleSalesData}
                                className="bg-green-600 px-4 py-2 rounded-lg text-white hover:bg-green-700 shadow-lg"
                            >
                                Add Sales Data
                            </button>
                            <button 
                                onClick={addSampleCustomerData}
                                className="bg-blue-600 px-4 py-2 rounded-lg text-white hover:bg-blue-700 shadow-lg"
                            >
                                Add Customer Data
                            </button>
                            <button 
                                onClick={fetchProfitChartData}
                                disabled={refreshing}
                                className="bg-gray-600 px-4 py-2 rounded-lg text-white hover:bg-gray-700 shadow-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Customer Data Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <CustomerDataCard 
                            icon={Users} 
                            title="Current Customers" 
                            value={currentCustomerCount} 
                            colorClass="bg-purple-600"
                        />
                        <CustomerDataCard 
                            icon={UserPlus} 
                            title="Predicted Customers" 
                            value={customerPrediction?.predicted_customer_count} 
                            colorClass="bg-yellow-600"
                        />
                        <CustomerDataCard 
                            icon={TrendingUp} 
                            title="Tomorrow's Sales" 
                            value={tomorrowPrediction?.predictedSales} 
                            colorClass="bg-green-600"
                        />
                        <CustomerDataCard 
                            icon={BarChart3} 
                            title="Accuracy" 
                            value={accuracyMetrics?.avg ? `${accuracyMetrics.avg}%` : null} 
                            colorClass="bg-blue-600"
                        />
                    </div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <MLStatusPanel status={profitMlStatus} title="Profit Prediction ML Service" serviceType="profit" />
                        <MLStatusPanel status={customerMlStatus} title="Customer Prediction ML Service" serviceType="customer" />
                    </div>

                    {/* Prediction Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TomorrowPredictionCard />
                        <CustomerPredictionCard />
                    </div>

                    {/* Accuracy Card */}
                    <div className="grid grid-cols-1">
                        <AccuracyMetricsCard />
                    </div>

                    {/* Chart Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="text-xl font-semibold text-white">Sales Prediction Analysis</h3>
                        <div className="bg-white/5 backdrop-blur-md p-1 rounded-lg flex gap-1">
                            <button 
                                onClick={() => setChartType("comparison")} 
                                className={`px-4 py-2 rounded-md transition-colors ${
                                    chartType === "comparison" 
                                        ? "bg-[#7C3AED] text-white shadow-lg" 
                                        : "text-gray-400 hover:text-white"
                                }`}
                            >
                                Line Chart
                            </button>
                            <button 
                                onClick={() => setChartType("total")} 
                                className={`px-4 py-2 rounded-md transition-colors ${
                                    chartType === "total" 
                                        ? "bg-[#7C3AED] text-white shadow-lg" 
                                        : "text-gray-400 hover:text-white"
                                }`}
                            >
                                Bar Chart
                            </button>
                        </div>
                    </div>

                    {/* Main Chart */}
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg">
                        {profitRecords.length > 0 ? (
                            <ReactApexChart 
                                options={chartOptions} 
                                series={chartSeries} 
                                type={chartType === "comparison" ? "line" : "bar"} 
                                height={350} 
                            />
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                <p className="text-lg mb-2">No sales data available</p>
                                <p className="text-sm">Add sample data or connect to your database</p>
                            </div>
                        )}
                    </div>

                    {/* Data Table */}
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg overflow-x-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-white">Sales Records</h3>
                            <span className="text-gray-400 text-sm">
                                Showing {profitRecords.length} records
                            </span>
                        </div>
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-700 text-gray-400 uppercase text-xs">
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4 text-right">Actual Sales</th>
                                    <th className="py-3 px-4 text-right">Predicted Sales</th>
                                    <th className="py-3 px-4 text-right">Difference</th>
                                    <th className="py-3 px-4 text-right">Accuracy</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profitRecords.slice().reverse().map((record, index) => {
                                    const hasBoth = record.totalSales && record.predictedSales;
                                    const difference = hasBoth ? record.predictedSales - record.totalSales : null;
                                    const accuracy = hasBoth && record.totalSales > 0 
                                        ? (100 - Math.abs(difference) / record.totalSales * 100) 
                                        : null;

                                    return (
                                        <tr key={index} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4">
                                                {new Date(record.date).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 text-right text-green-400 font-mono">
                                                {record.totalSales ? `$${record.totalSales.toFixed(2)}` : "N/A"}
                                            </td>
                                            <td className="py-3 px-4 text-right text-[#A78BFA] font-mono">
                                                {record.predictedSales ? `$${record.predictedSales.toFixed(2)}` : "N/A"}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono">
                                                {difference !== null ? (
                                                    <span className={difference > 0 ? "text-red-400" : "text-green-400"}>
                                                        {difference > 0 ? "+" : ""}${Math.abs(difference).toFixed(2)}
                                                    </span>
                                                ) : "N/A"}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {accuracy !== null ? (
                                                    <span className={
                                                        accuracy >= 90 ? "text-green-400" :
                                                        accuracy >= 80 ? "text-yellow-400" : "text-red-400"
                                                    }>
                                                        {accuracy.toFixed(1)}%
                                                    </span>
                                                ) : "N/A"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}