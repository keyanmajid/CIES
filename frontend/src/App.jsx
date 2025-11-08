import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CartProvider } from './context/CartContext'; // Import CartProvider
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CustomerCare from "./pages/CustomerCare";
import ManagerDashboard from "./pages/ManagerDashboard";
import CartTest from "./pages/CartTest";

export default function App() {
  return (
    <CartProvider> {/* Wrap everything with CartProvider */}
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/care" element={<CustomerCare />} />
          <Route path="/cart" element={<CartTest />} />
          <Route path="/manager" element={<ManagerDashboard />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}