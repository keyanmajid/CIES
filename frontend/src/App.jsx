import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from './context/CartContext'; // Import CartProvider
import Home from "./pages/Home";
;
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CustomerCare from "./pages/CustomerCare";
import ManagerDashboard from "./pages/ManagerDashboard";
import CartTest from "./pages/CartTest";
import TestInteractions from "./pages/TestInteractions";
import EmployeeSignup from "./pages/EmployeeSignup";
import ManagerEmployees from "./pages/ManagerEmployees";
import ChatCustomer from "./pages/ChatCustomer";
import ChatEmployee from "./pages/ChatEmployee";
import EmployeeDashboard from "./pages/EmployeeDashboard ";
import ProductPageWithNavbar from "./pages/Products";
import { RecommendationProvider } from './context/RecommendationContext';
import EmployeeSatisfactionDashboard from './pages/EmployeeSatisfactionDashboard';

// ✅ ADD THIS ProtectedRoute component (add it right here)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  
  if (!token || !user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default function App() {
  // ✅ ADD THIS function to get user data
  const getUser = () => {
    return JSON.parse(localStorage.getItem("user"));
  };

  return (
    <CartProvider> {/* Wrap everything with CartProvider */}
    <RecommendationProvider>
            <Router>
        <Routes>
          <Route path="/" element={<Home />} />
      
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/care" element={<CustomerCare />} />
          <Route path="/cart" element={<CartTest />} />
          <Route path="/manager-dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/add-employee" element={<EmployeeSignup />} />
          <Route path="/manager/employees" element={<ManagerEmployees />} />
          <Route path="/chat/customer" element={<ChatCustomer />} />
          <Route path="/chat/employee" element={<ChatEmployee />} />
          <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
          <Route path="/products" element={<ProductPageWithNavbar />} />
          <Route path="/EmployeeSignup" element={<EmployeeSignup />} />
<Route path="/employee/satisfaction" element={
  <ProtectedRoute>
    <EmployeeSatisfactionDashboard employeeId={getUser()?.id} />
  </ProtectedRoute>

} />

        </Routes>
      </Router>
      </RecommendationProvider>

    </CartProvider>
  );
}