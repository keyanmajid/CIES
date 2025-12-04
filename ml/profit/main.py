# main.py
from fastapi import FastAPI
from pydantic import BaseModel
from pymongo import MongoClient
import joblib
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone

# ------------------------------
# FastAPI App
# ------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# MongoDB
# ------------------------------
MONGO_URI = "mongodb+srv://keyanmajid57:.$iloveyou3000@cluster0.v1y4f9x.mongodb.net/cies?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client["cies"]
profitlogs = db["profitlogs"]

# ------------------------------
# Load 5-day sales model
# ------------------------------
model = joblib.load("sales_model_5days.pkl")  # Model trained on last 5 days

# ------------------------------
# Request Models
# ------------------------------
class UpdateSalesRequest(BaseModel):
    date: str        # YYYY-MM-DD
    totalSales: float

class PredictionResponse(BaseModel):
    date: str
    totalSales: float | None
    predictedSales: float

# ------------------------------
# Helpers
# ------------------------------
def normalize_date_utc(dt: datetime) -> datetime:
    """Normalize datetime to 00:00:00 UTC."""
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)

# ------------------------------
# Update or create total sales
# ------------------------------
@app.post("/update-sales")
def update_sales(req: UpdateSalesRequest):
    """
    Update totalSales for a specific date (YYYY-MM-DD)
    """
    try:
        target_date = datetime.strptime(req.date, "%Y-%m-%d")
        target_date = normalize_date_utc(target_date)
    except:
        return {"error": "Invalid date format. Use YYYY-MM-DD."}

    # Match any document within the day
    start = target_date
    end = target_date + timedelta(days=1)
    existing = profitlogs.find_one({"date": {"$gte": start, "$lt": end}})

    if existing:
        profitlogs.update_one(
            {"_id": existing["_id"]},
            {"$set": {"totalSales": req.totalSales}}
        )
        return {"message": f"Updated totalSales for {req.date} to {req.totalSales}"}
    else:
        profitlogs.insert_one({
            "date": target_date,
            "totalSales": req.totalSales,
            "predictedSales": None
        })
        return {"message": f"Created new record for {req.date} with totalSales={req.totalSales}"}

# ------------------------------
# Predict for any date
# ------------------------------
@app.get("/predict-for-date")
def predict_for_date(date: str):
    """
    Predict sales for any date (YYYY-MM-DD).
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except:
        return {"error": "Invalid date format. Use YYYY-MM-DD."}

    target_date = normalize_date_utc(target_date)

    # Fetch last 5 logs with real totalSales
    last_5_logs = list(
        profitlogs.find({"totalSales": {"$ne": None}})
        .sort("date", -1)
        .limit(5)
    )

    if len(last_5_logs) < 5:
        return {"message": "Not enough data. Need at least 5 previous sales records."}

    # Sort ascending
    last_5_logs = sorted(last_5_logs, key=lambda x: x['date'])

    prev_sales = [float(log["totalSales"]) for log in last_5_logs]
    cogs = np.mean(prev_sales) * 0.80
    rating = 5.0
    X = np.array([prev_sales + [cogs, rating]])

    predicted_sales = float(model.predict(X)[0])
    predicted_sales = max(0, predicted_sales)

    # Update existing row if exists
    start = target_date
    end = target_date + timedelta(days=1)
    existing = profitlogs.find_one({"date": {"$gte": start, "$lt": end}})

    if existing:
        profitlogs.update_one(
            {"_id": existing["_id"]},
            {"$set": {"predictedSales": predicted_sales}}
        )
        totalSales = existing.get("totalSales")
    else:
        profitlogs.insert_one({
            "date": target_date,
            "totalSales": None,
            "predictedSales": predicted_sales
        })
        totalSales = None

    return {
        "date": target_date.isoformat(),
        "predictedSales": predicted_sales,
        "totalSales": totalSales
    }

# ------------------------------
# Predict for tomorrow
# ------------------------------
@app.get("/predict-tomorrow-sales")
def predict_tomorrow_sales():
    tomorrow = datetime.utcnow() + timedelta(days=1)
    return predict_for_date(tomorrow.strftime("%Y-%m-%d"))

# ------------------------------
# Root
# ------------------------------
@app.get("/")
def root():
    return {"message": "Sales Prediction API Running"}

# ------------------------------
# Run with Uvicorn if executed directly
# ------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=7860, reload=True)