import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    type: {
      type: String,
      enum: ["search", "add_to_cart", "purchase"],
      required: true,
    },
    searchQuery: { type: String },
    quantity: { type: Number, default: 1 }, // ✅ Add quantity field
    orderId: { type: String }, // ✅ Optional: to group purchase activities
    totalPrice: { type: Number } // ✅ Optional: to track purchase value
  },
  { timestamps: true }
);

export default mongoose.model("Activity", activitySchema);