// models/Interaction.js
import mongoose from "mongoose";
// ✅ CUSTOMER SATISFACTION FIELDS (ADD THESE)

  
const MessageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["customer", "employee"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  length: { type: Number },
  wordCount: { type: Number }
});

const ToxicityAnalysisSchema = new mongoose.Schema({
  analyzedAt: { type: Date, default: Date.now },
  employeeToxicityScore: { type: Number, default: 0 },
  toxicCategories: [{ type: String }],
  pointsDeducted: { type: Number, default: 0 },
  severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "NONE"], default: "NONE" },
  employeeScoreBefore: { type: Number, default: 0 },
  employeeScoreAfter: { type: Number, default: 0 }
});

const InteractionSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["chat", "call"], required: true, default: "chat" },
  messages: [MessageSchema],
  sentimentScore: { type: Number, default: null },
  personalInfoFlag: { type: Boolean, default: false },
  badLanguageFlag: { type: Boolean, default: false },
  pointsDeducted: { type: Number, default: 0 },
  features: { type: mongoose.Schema.Types.Mixed, default: {} },
  satisfaction: { type: String, enum: ["satisfied", "neutral", "unsatisfied"], default: null },
  status: { type: String, enum: ["pending", "active", "completed"], default: "pending" },
  completedAt: { type: Date },
  completionReason: { type: String },
  toxicityAnalysis: ToxicityAnalysisSchema,
  duration: { type: String },

   customerSatisfaction: {
    predictedLabel: { type: String, enum: ["satisfied", "neutral", "dissatisfied"], default: null },
    confidence: { type: Number, default: null },
    satisfactionScore: { type: Number, default: null }, // 0-100
    analyzedAt: { type: Date, default: null },
    mlModelVersion: { type: String, default: null }
  },
  
  // Customer feedback (optional manual feedback)
  customerFeedback: {
    rating: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: null },
    submittedAt: { type: Date, default: null }
  },
  
  // For tracking satisfaction analysis history
  satisfactionAnalysisHistory: [{
    timestamp: { type: Date, default: Date.now },
    predictedLabel: String,
    confidence: Number,
    satisfactionScore: Number,
    modelVersion: String,
    source: { type: String, enum: ["ml", "manual", "auto"], default: "ml" }
  }],
  
  // Flags for quick filtering
  isCustomerSatisfied: { type: Boolean, default: null },
  needsFollowup: { type: Boolean, default: false },
  
}, { timestamps: true });

// Add indexes for better query performance
InteractionSchema.index({ customerId: 1, status: 1 });
InteractionSchema.index({ employeeId: 1, status: 1 });
InteractionSchema.index({ createdAt: -1 });

export default mongoose.model("Interaction", InteractionSchema);