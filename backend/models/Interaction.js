// models/Interaction.js
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["customer", "employee"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  length: { type: Number },
  wordCount: { type: Number }
});

const InteractionSchema = new mongoose.Schema({
  customerId: { type: String, required: true }, // ADD THIS LINE
  customerName: { type: String, required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["chat", "call"], required: true },
  messages: [MessageSchema],
  sentimentScore: { type: Number, default: null },
  personalInfoFlag: { type: Boolean, default: false },
  badLanguageFlag: { type: Boolean, default: false },
  pointsDeducted: { type: Number, default: 0 }, // ADD THIS IF MISSING
  features: { type: mongoose.Schema.Types.Mixed, default: {} },
  satisfaction: { type: String, enum: ["satisfied", "neutral", "unsatisfied"], default: null },
  status: { type: String, enum: ["pending", "active", "completed"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("Interaction", InteractionSchema);