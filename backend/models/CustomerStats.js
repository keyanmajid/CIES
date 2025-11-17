import mongoose from "mongoose";

const CustomerStatsSchema = new mongoose.Schema({
  date: { type: Date, required: true },        // use Date type instead of String
  customerCount: { type: Number, default: 0 }, // actual historical count
  predictedCount: { type: Number, default: null } // predicted by ML
});

export default mongoose.model("CustomerStats", CustomerStatsSchema);
