// backend/routes/orderRoutes.js
import express from "express";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import ProfitLog from "../models/ProfitLog.js";
import { verifyUser } from "../middlewares/auth.js";

const router = express.Router();

// Checkout route
router.post("/purchase", verifyUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's cart
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, error: "Cart is empty" });
    }

    // Calculate total
    const totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create order
    const order = new Order({
      customerId: userId,
      items: cart.items.map(i => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      totalPrice
    });
    await order.save();

    // Update ProfitLog
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    await ProfitLog.findOneAndUpdate(
      { date: today },
      { $inc: { totalSales: totalPrice } },
      { upsert: true }
    );

    // Clear cart
    await Cart.findOneAndDelete({ userId });

    res.json({ success: true, message: "Purchase completed", orderId: order._id, totalPrice });
  } catch (err) {
    console.error("Purchase error:", err);
    res.status(500).json({ success: false, error: "Failed to complete purchase" });
  }
});

export default router;
