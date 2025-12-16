import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  User,
  Mail,
  Phone,
  Calendar,
  Award,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Clock,
  LogOut,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Trash2,
  ChevronDown,
  UserPlus,
  Home,
  BarChart3,
  Menu,
  X,
  RefreshCw,
  Download,
  UserCheck,
  UserX,
  Activity,
  Star,
  Crown,
  Briefcase,
  Check,
  AlertTriangle,
  Sparkles
} from "lucide-react";

const ManagerEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    highPerformers: 0,
    avgScore: 0
  });
  
  const navigate = useNavigate();

  // Handle window resize
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    if (userData) {
      const user = JSON.parse(userData);
      if (user.role !== "manager") {
        alert("Only managers can access this page");
        navigate("/care");
        return;
      }
    }

    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("https://cies-5dc4.onrender.com/api/manager/employees", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        
        let employeeList = [];
        if (Array.isArray(data)) {
          employeeList = data;
        } else if (Array.isArray(data.employees)) {
          employeeList = data.employees;
        } else {
          console.error("Unexpected response:", data);
          employeeList = [];
        }
        
        setEmployees(employeeList);
        
        // Calculate stats
        const total = employeeList.length;
        const active = employeeList.filter(e => e.status !== 'inactive').length;
        const highPerformers = employeeList.filter(e => e.score >= 80).length;
        const avgScore = total > 0 
          ? employeeList.reduce((sum, e) => sum + (e.score || 0), 0) / total 
          : 0;
        
        setStats({ total, active, highPerformers, avgScore: avgScore.toFixed(1) });
        
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [navigate]);

  const handleFireEmployee = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const confirmFireEmployee = async () => {
    if (!employeeToDelete) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://cies-5dc4.onrender.com/api/manager/employees/${employeeToDelete._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Remove employee from state
        setEmployees(prev => prev.filter(emp => emp._id !== employeeToDelete._id));
        setShowDeleteModal(false);
        setShowConfirmation(true);
        
        // Update stats
        setStats(prev => ({
          total: prev.total - 1,
          active: employeeToDelete.status === 'active' ? prev.active - 1 : prev.active,
          highPerformers: employeeToDelete.score >= 80 ? prev.highPerformers - 1 : prev.highPerformers,
          avgScore: ((prev.avgScore * prev.total - (employeeToDelete.score || 0)) / (prev.total - 1)).toFixed(1)
        }));
        
        setTimeout(() => setShowConfirmation(false), 3000);
      } else {
        alert(`Failed to fire employee: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error firing employee:", error);
      alert("Error firing employee. Please try again.");
    }
  };

  const navigateToDashboard = () => {
    navigate("/care");
    isMobile && setSidebarOpen(false);
  };

  const navigateToAddEmployee = () => {
    navigate("/EmployeeSignup");
    isMobile && setSidebarOpen(false);
  };

  const navigateToHome = () => {
    navigate("/");
    isMobile && setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || emp.role === selectedRole;
    const matchesStatus = selectedStatus === "all" || emp.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-400";
    if (score >= 80) return "text-green-300";
    if (score >= 70) return "text-yellow-400";
    if (score >= 60) return "text-yellow-500";
    return "text-red-400";
  };

  const getPerformanceBadge = (score) => {
    if (score >= 90) return { text: "Top Performer", color: "bg-gradient-to-r from-green-600 to-emerald-600", icon: <Crown className="w-3 h-3" /> };
    if (score >= 80) return { text: "Excellent", color: "bg-gradient-to-r from-blue-600 to-cyan-600", icon: <Award className="w-3 h-3" /> };
    if (score >= 70) return { text: "Good", color: "bg-gradient-to-r from-yellow-600 to-orange-500", icon: <TrendingUp className="w-3 h-3" /> };
    if (score >= 60) return { text: "Average", color: "bg-gradient-to-r from-gray-600 to-gray-500", icon: <Target className="w-3 h-3" /> };
    return { text: "Needs Improvement", color: "bg-gradient-to-r from-red-600 to-rose-600", icon: <TrendingDown className="w-3 h-3" /> };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-black">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Users className="w-10 h-10 text-white" />
          </div>
          <p className="text-lg text-gray-300">Loading employees...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching team data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        id="sidebar"
        className={`
          fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out
          ${isMobile 
            ? `${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-72`
            : 'w-72'
          }
          bg-gray-800/80 backdrop-blur-xl border-r border-gray-700/50
        `}
      >
        <div className="flex flex-col h-full p-4 md:p-6">
          {/* Logo */}
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-white">Manager Portal</h1>
                <p className="text-gray-400 text-xs md:text-sm">Team Management</p>
              </div>
            </div>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 md:space-y-2">
            <button
              onClick={navigateToHome}
              className="w-full flex items-center gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-all group"
            >
              <Home className="w-5 h-5 group-hover:text-yellow-400" />
              <span className="font-medium text-sm md:text-base">Back to Home</span>
            </button>
            <button
              onClick={navigateToDashboard}
              className="w-full flex items-center gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-all group"
            >
              <BarChart3 className="w-5 h-5 group-hover:text-blue-400" />
              <span className="font-medium text-sm md:text-base">AI Dashboard</span>
            </button>
            <button
              onClick={navigateToAddEmployee}
              className="w-full flex items-center gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-all group"
            >
              <UserPlus className="w-5 h-5 group-hover:text-green-400" />
              <span className="font-medium text-sm md:text-base">Add Employee</span>
            </button>
            <button
              onClick={() => alert("Settings coming soon!")}
              className="w-full flex items-center gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-all group"
            >
              <Edit className="w-5 h-5 group-hover:text-purple-400" />
              <span className="font-medium text-sm md:text-base">Edit Profile</span>
            </button>
          </nav>

          {/* Stats */}
          <div className="p-4">
            <div className="bg-gray-900/50 rounded-xl p-4">
              <h4 className="text-sm text-gray-400 mb-3">Team Stats</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Total Employees</span>
                  <span className="text-white font-semibold">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Active</span>
                  <span className="text-green-400 font-semibold">{stats.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Avg Score</span>
                  <span className="text-blue-400 font-semibold">{stats.avgScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-700/50 pt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 md:px-4 md:py-3 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all group"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium text-sm md:text-base">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-72 overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
          <button 
            id="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-white">Employee Management</h2>
          <div className="w-6"></div> {/* Spacer */}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
                Team Management Dashboard
              </h1>
              <p className="text-gray-400 text-sm md:text-base mt-2">
                Manage {stats.total} employees across your organization
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={navigateToAddEmployee}
                className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 rounded-xl text-white hover:opacity-90 transition-all font-medium flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Employee
              </button>
              <button
                onClick={() => window.print()}
                className="bg-gradient-to-r from-gray-700 to-gray-600 px-4 py-2 rounded-xl text-white hover:opacity-90 transition-all font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 p-4 md:p-6 rounded-2xl border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Employees</p>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mt-1">{stats.total}</h3>
                </div>
                <div className="p-3 bg-blue-600/20 rounded-xl">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-xs text-blue-400">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>All team members</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-4 md:p-6 rounded-2xl border border-green-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Now</p>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mt-1">{stats.active}</h3>
                </div>
                <div className="p-3 bg-green-600/20 rounded-xl">
                  <UserCheck className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-xs text-green-400">
                <Activity className="w-3 h-3 mr-1" />
                <span>Currently working</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-4 md:p-6 rounded-2xl border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Top Performers</p>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mt-1">{stats.highPerformers}</h3>
                </div>
                <div className="p-3 bg-purple-600/20 rounded-xl">
                  <Crown className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-xs text-purple-400">
                <Sparkles className="w-3 h-3 mr-1" />
                <span>Score ≥ 80</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 p-4 md:p-6 rounded-2xl border border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Avg Performance</p>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mt-1">{stats.avgScore}</h3>
                </div>
                <div className="p-3 bg-yellow-600/20 rounded-xl">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
              <div className="flex items-center mt-4 text-xs text-yellow-400">
                <Target className="w-3 h-3 mr-1" />
                <span>Team average</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 md:p-6 mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search employees by name, email, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  <option value="agent">Agent</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Manager</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Employees Grid */}
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-700/50">
                <UserX className="w-12 h-12 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Employees Found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedRole("all");
                  setSelectedStatus("all");
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 rounded-xl text-white hover:opacity-90 transition-all font-medium"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-400">
                  Showing <span className="text-white font-semibold">{filteredEmployees.length}</span> of {employees.length} employees
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 text-gray-400 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredEmployees.map((emp) => {
                  const performance = getPerformanceBadge(emp.score || 0);
                  return (
                    <div
                      key={emp._id}
                      className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-5 hover:border-blue-500/30 hover:shadow-[0_0_25px_#3B82F6]/10 transition-all duration-300"
                    >
                      {/* Employee Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-white">{emp.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${performance.color} flex items-center gap-1 w-fit mt-1`}>
                              {performance.icon}
                              {performance.text}
                            </span>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-white p-2">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Employee Details */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-300">{emp.email}</span>
                        </div>
                        {emp.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-gray-300">{emp.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm">
                          <Briefcase className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-300 capitalize">{emp.role || 'Employee'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-300">
                            Joined {new Date(emp.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Performance Score */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-400 text-sm">Performance Score</span>
                          <span className={`font-bold ${getScoreColor(emp.score || 0)}`}>
                            {emp.score || 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700/50 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              (emp.score || 0) >= 80 ? 'bg-green-500' :
                              (emp.score || 0) >= 70 ? 'bg-yellow-500' :
                              (emp.score || 0) >= 60 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(emp.score || 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/employee/${emp._id}`)}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 text-white py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => handleFireEmployee(emp)}
                          className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && employeeToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-red-500/30 p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Fire Employee?</h3>
              <p className="text-gray-400">
                Are you sure you want to fire <span className="font-semibold text-white">{employeeToDelete.name}</span>? This action cannot be undone.
              </p>
            </div>
            
            <div className="bg-gray-900/50 rounded-xl p-4 mb-6">
              <p className="text-gray-400 text-sm mb-2">Employee Details:</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{employeeToDelete.name}</p>
                  <p className="text-gray-400 text-sm">{employeeToDelete.email}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmFireEmployee}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Fire Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Confirmation */}
      {showConfirmation && (
        <div className="fixed bottom-4 right-4 z-50 animate-slideInUp">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold">Employee Removed Successfully!</p>
              <p className="text-sm opacity-90">The employee has been fired from the system.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerEmployees;