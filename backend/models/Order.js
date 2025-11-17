// backend/models/Order.js
import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  customerId: { type: String, required: true }, // who placed the order
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  totalPrice: { type: Number, required: true }, // sum of item prices * quantities
  createdAt: { type: Date, default: Date.now }  // when the order was placed
});

export default mongoose.model("Order", OrderSchema);
