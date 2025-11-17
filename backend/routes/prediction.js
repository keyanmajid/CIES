import express from "express";
import CustomerStats from "../models/CustomerStats.js";
import ProfitLog from "../models/ProfitLog.js";
import moment from "moment";

const router = express.Router();

/**
 * GET /api/prediction/customers
 * Returns historical + predicted customer counts
 */
router.get("/customers", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = moment().subtract(days, "days").startOf("day").toDate();

    const stats = await CustomerStats.find({ date: { $gte: startDate } })
      .sort({ date: 1 })
      .select("date customerCount predictedCount");

    res.json({ success: true, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * POST /api/prediction/customers
 * Save predicted customer counts
 * Body: [{ date: "2025-11-17", predictedCount: 38 }, ...]
 */
router.post("/customers", async (req, res) => {
  try {
    const predictions = req.body;

    if (!Array.isArray(predictions)) {
      return res.status(400).json({ success: false, error: "Invalid data format, must be an array" });
    }

    const updatedRecords = [];
    for (const item of predictions) {
      if (!item.date || typeof item.predictedCount !== "number") continue;

      const record = await CustomerStats.findOneAndUpdate(
        { date: new Date(item.date) },
        { predictedCount: item.predictedCount },
        { upsert: true, new: true }
      );
      updatedRecords.push(record);
    }

    res.json({ success: true, updatedRecords });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save predictions" });
  }
});

/**
 * GET /api/prediction/profit
 * Returns historical + predicted profit
 */
router.get("/profit", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = moment().subtract(days, "days").startOf("day").toDate();

    const profits = await ProfitLog.find({ date: { $gte: startDate } })
      .sort({ date: 1 })
      .select("date totalSales predictedSales");

    res.json({ success: true, profits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * POST /api/prediction/profit
 * Save predicted profit
 * Body: [{ date: "2025-11-17", predictedSales: 12500 }, ...]
 */
router.post("/profit", async (req, res) => {
  try {
    const predictions = req.body;

    if (!Array.isArray(predictions)) {
      return res.status(400).json({ success: false, error: "Invalid data format, must be an array" });
    }

    const updatedRecords = [];
    for (const item of predictions) {
      if (!item.date || typeof item.predictedSales !== "number") continue;

      const record = await ProfitLog.findOneAndUpdate(
        { date: new Date(item.date) },
        { predictedSales: item.predictedSales },
        { upsert: true, new: true }
      );
      updatedRecords.push(record);
    }

    res.json({ success: true, updatedRecords });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save predictions" });
  }
});

export default router;
