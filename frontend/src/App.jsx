import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CustomerCare from "./pages/CustomerCare";
import ManagerDashboard from "./pages/ManagerDashboard";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/care" element={<CustomerCare />} />
        <Route path="/manager" element={<ManagerDashboard />} />
      </Routes>
    </Router>
  );
}
