import mongoose from "mongoose";

const ProfitLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },        // Date type for filtering
  totalSales: { type: Number, default: 0 },    // actual profit
  predictedSales: { type: Number, default: null } // predicted profit
});

export default mongoose.model("ProfitLog", ProfitLogSchema);
