import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["customer", "employee", "manager"], default: "customer" },
});

export default mongoose.model("User", userSchema);
