// models/User.js (Updated)
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer", "employee", "manager"], default: "customer" },
  
  // Employees only
  score: { type: Number, default: 100 },
  status: { type: String, enum: ["active", "fired", "suspended"], default: "active" },
  firedAt: Date,
  suspensionEndsAt: Date,
  
  // Customers only
  interests: [String],
  purchased: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  searchHistory: [String]
}, { timestamps: true });

// Add index for frequently queried fields
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ score: 1 });

export default mongoose.model('User', UserSchema);