import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true
    },
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Product",
      index: true 
    },
    type: {
      type: String,
      enum: ["search", "add_to_cart", "view", "purchase"],
      required: true,
      index: true
    },
    searchQuery: { 
      type: String,
      index: true 
    },
    quantity: { 
      type: Number, 
      default: 1 
    },
    orderId: { 
      type: String 
    },
    totalPrice: { 
      type: Number 
    },
    
    // ✅ NEW FIELDS FOR ML RECOMMENDATIONS
    sessionId: {
      type: String,
      index: true
    },
    implicitRating: {
      type: Number,
      min: 0.1,
      max: 5.0,
      default: function() {
        const ratings = {
          purchase: 5.0,
          add_to_cart: 3.0,
          view: 2.0,
          search: 1.5
        };
        return ratings[this.type] || 1.0;
      }
    },
    context: {
      page: String,
      device: {
        type: String,
        enum: ["mobile", "desktop", "tablet"]
      },
      referrer: String
    },
    productSnapshot: {
      name: String,
      category: String,
      tags: [String],
      price: Number
    },
    duration: {
      type: Number,
      default: 0
    }
  },
  { 
    timestamps: true 
  }
);

// ✅ Performance indexes for ML queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, type: 1 });
activitySchema.index({ productId: 1, type: 1 });
activitySchema.index({ sessionId: 1 });
activitySchema.index({ "createdAt": 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

export default mongoose.model("Activity", activitySchema);