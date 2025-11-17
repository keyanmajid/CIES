import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer", "employee", "manager"], default: "customer" },
  
  // Employees only
  score: { type: Number, default: 100 },

  // Customers only
  interests: [String],
  purchased: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  searchHistory: [String]  // keywords searched
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
