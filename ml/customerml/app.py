from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import pandas as pd
import joblib
import numpy as np
from datetime import datetime, timedelta
import os
from typing import List, Dict
import urllib

app = FastAPI()

# Your MongoDB Atlas connection details
USERNAME = "keyanmajid57"
PASSWORD = ".$iloveyou3000"
CLUSTER = "cluster0.v1y4f9x"
DATABASE = "cies"

# URL encode the password to handle special characters
encoded_password = urllib.parse.quote_plus(PASSWORD)

# MongoDB Atlas connection string
MONGO_URI = f"mongodb+srv://{USERNAME}:{encoded_password}@{CLUSTER}.mongodb.net/{DATABASE}?retryWrites=true&w=majority"

# MongoDB connection with error handling
try:
    client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
    client.admin.command('ping')
    db = client[DATABASE]
    customer_stats = db.customerstats
    
    print("✅ Connected to MongoDB Atlas successfully!")
    print(f"📊 Database: {DATABASE}, Collection: customerstats")
    
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    client = None
    db = None
    customer_stats = None

class CustomerPredictionService:
    def __init__(self, model_path: str):
        try:
            model_data = joblib.load(model_path)
            self.linear_model = model_data['linear_model']
            self.poly_model = model_data['poly_model']
            self.poly_features = model_data['poly_features']
            self.feature_columns = model_data['feature_columns']
            self.best_model_type = model_data['best_model_type']
            self.is_trained = model_data['is_trained']
            self.prediction_type = model_data.get('prediction_type', 'daily_next_day_robust_missing')
            
            print(f"✅ Robust customer prediction model loaded: {self.best_model_type} regression")
            print(f"🎯 Prediction type: {self.prediction_type}")
            
        except Exception as e:
            raise ValueError(f"Failed to load customer model: {str(e)}")
    
    def _get_available_days_data(self, historical_data, required_days=5, max_lookback_days=10):
        """Get available days data, looking further back if needed"""
        if len(historical_data) < required_days:
            return historical_data[-required_days:] if len(historical_data) >= required_days else historical_data
        
        recent_data = historical_data[-max_lookback_days:]
        if len(recent_data) >= required_days:
            return recent_data[-required_days:]
        else:
            return recent_data
    
    def predict_next_day(self) -> Dict:
        """Predict next day's customer count based on last 5 days from database"""
        try:
            if customer_stats is None:
                raise ValueError("Database connection not available")
            
            # Get historical data - look back up to 14 days to handle missing days
            historical_data = list(customer_stats.find(
                {"customerCount": {"$exists": True}},
                sort=[("date", -1)],
                limit=14  # Look back 14 days to handle missing data
            ))
            
            print(f"📊 Found {len(historical_data)} days of historical data in DB")
            
            if len(historical_data) < 3:
                return self._fallback_prediction("Need at least 3 days of historical data")
            
            # Prepare data for prediction
            prepared_data = []
            for record in historical_data:
                prepared_data.append({
                    'date': record['date'],
                    'customer_count': record['customerCount']
                })
            
            # Sort by date (oldest first)
            prepared_data = sorted(prepared_data, key=lambda x: x['date'])
            
            # Get available data (handles missing days)
            available_data = self._get_available_days_data(prepared_data, required_days=5, max_lookback_days=10)
            
            print(f"📅 Using {len(available_data)} available days for prediction")
            
            # Extract data for prediction
            customer_counts = [day['customer_count'] for day in available_data]
            dates = [day['date'] for day in available_data]
            last_date = dates[-1]
            
            # Calculate next date
            next_date = last_date + timedelta(days=1)
            
            # Prepare features (robust to missing days)
            features = {
                'prev_day_1': customer_counts[-1] if len(customer_counts) >= 1 else np.mean(customer_counts),
                'prev_day_2': customer_counts[-2] if len(customer_counts) >= 2 else np.mean(customer_counts),
                'prev_day_3': customer_counts[-3] if len(customer_counts) >= 3 else np.mean(customer_counts),
                'prev_day_4': customer_counts[-4] if len(customer_counts) >= 4 else np.mean(customer_counts),
                'prev_day_5': customer_counts[-5] if len(customer_counts) >= 5 else np.mean(customer_counts),
                'recent_avg_3d': np.mean(customer_counts[-3:]) if len(customer_counts) >= 3 else np.mean(customer_counts),
                'recent_avg_5d': np.mean(customer_counts[-5:]) if len(customer_counts) >= 5 else np.mean(customer_counts),
                'recent_avg_7d': np.mean(customer_counts) if len(customer_counts) >= 1 else 1000,
                'recent_trend': (customer_counts[-1] - customer_counts[0]) / len(customer_counts) if len(customer_counts) > 1 else 0,
                'dow_avg': np.mean([d for d in customer_counts]) if customer_counts else 1000,
                'day_of_week': next_date.weekday(),
                'day_of_month': next_date.day,
                'month': next_date.month,
                'is_weekend': 1 if next_date.weekday() >= 5 else 0
            }
            
            # Create feature array
            X_pred = pd.DataFrame([features])[self.feature_columns]
            
            # Make prediction
            if self.best_model_type == 'polynomial':
                X_pred_poly = self.poly_features.transform(X_pred)
                predicted_count = self.poly_model.predict(X_pred_poly)[0]
            else:
                predicted_count = self.linear_model.predict(X_pred)[0]
            
            predicted_count = max(0, int(predicted_count))
            
            prediction_result = {
                'date': next_date.isoformat(),
                'predicted_customer_count': predicted_count,
                'model_used': self.best_model_type,
                'prediction_date': datetime.now().isoformat(),
                'based_on_last_days': len(available_data),
                'available_dates_used': [d.strftime('%Y-%m-%d') for d in dates],
                'data_status': 'robust_prediction' if len(available_data) >= 3 else 'limited_data'
            }
            
            # Store prediction in database
            customer_stats.update_one(
                {'date': next_date},
                {'$set': {
                    'date': next_date,
                    'predictedCount': predicted_count,
                    'prediction_timestamp': datetime.now(),
                    'model_used': self.best_model_type,
                    'prediction_type': 'next_day_robust',
                    'data_points_used': len(available_data)
                }},
                upsert=True
            )
            
            return prediction_result
            
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return self._fallback_prediction(f"Prediction error: {str(e)}")
    
    def _fallback_prediction(self, reason: str) -> Dict:
        """Fallback prediction when there's not enough data"""
        next_date = datetime.now() + timedelta(days=1)
        
        return {
            'date': next_date.isoformat(),
            'predicted_customer_count': 1200,
            'model_used': 'fallback',
            'prediction_date': datetime.now().isoformat(),
            'based_on_last_days': 0,
            'available_dates_used': [],
            'data_status': 'fallback',
            'reason': reason
        }

# Load the ROBUST customer prediction model
try:
    customer_service = CustomerPredictionService('robust_daily_customer_model.pkl')
    CUSTOMER_MODEL_LOADED = True
    print("🎯 ROBUST DAILY Customer prediction service READY!")
except Exception as e:
    print(f"❌ Failed to load customer model: {e}")
    customer_service = None
    CUSTOMER_MODEL_LOADED = False

@app.get("/")
async def root():
    return {"message": "Customer Prediction ML Service", "status": "running"}

@app.get("/status")
async def get_status():
    """Get customer prediction service status"""
    try:
        if customer_stats is None:
            return {
                "success": False,
                "error": "Database connection failed",
                "model_available": False
            }
        
        # Count customer records in database
        record_count = customer_stats.count_documents({"customerCount": {"$exists": True}})
        
        # Get current customer count (latest record with actual data)
        current_count = 0
        latest_record = customer_stats.find_one(
            {"customerCount": {"$exists": True}},
            sort=[("date", -1)]
        )
        if latest_record:
            current_count = latest_record.get('customerCount', 0)
        
        # Get latest prediction
        predicted_count = 0
        latest_prediction = customer_stats.find_one(
            {"predictedCount": {"$exists": True}},
            sort=[("date", -1)]
        )
        if latest_prediction:
            predicted_count = latest_prediction.get('predictedCount', 0)
        
        return {
            "success": True,
            "model_available": CUSTOMER_MODEL_LOADED,
            "model_type": customer_service.best_model_type if CUSTOMER_MODEL_LOADED else "None",
            "prediction_type": "next_day_based_on_5_days",
            "current_customer_count": current_count,
            "predicted_customer_count": predicted_count,
            "historical_records": record_count,
            "database_connected": True,
            "prediction_capability": CUSTOMER_MODEL_LOADED and record_count >= 3
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Error checking status: {str(e)}",
            "model_available": False,
            "database_connected": False
        }

@app.post("/predict-next-day")
async def predict_next_day():
    """Predict next day's customer count based on last 5 days"""
    try:
        if not CUSTOMER_MODEL_LOADED:
            raise HTTPException(status_code=503, detail="Customer prediction model not loaded")
        
        if customer_stats is None:
            raise HTTPException(status_code=503, detail="Database connection failed")
        
        prediction = customer_service.predict_next_day()
        
        return {
            "success": True,
            "prediction": prediction,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/current-count-only")
async def get_current_customer_count():
    """Get only the current customer count from database"""
    try:
        if customer_stats is None:
            return {
                "success": False,
                "error": "Database connection failed"
            }
        
        latest_record = customer_stats.find_one(
            {"customerCount": {"$exists": True}},
            sort=[("date", -1)]
        )
        
        if latest_record:
            current_count = latest_record.get('customerCount', 0)
        else:
            current_count = 0
        
        return {
            "success": True,
            "current_customer_count": current_count
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching current count: {str(e)}")

@app.post("/add-customer-data")
async def add_customer_data(data: dict):
    """Add actual customer count data to database"""
    try:
        if customer_stats is None:
            raise HTTPException(status_code=503, detail="Database connection failed")
        
        date_str = data.get('date')
        customer_count = data.get('customerCount')
        
        if not date_str or customer_count is None:
            raise HTTPException(status_code=400, detail="Missing date or customerCount")
        
        # Convert date
        try:
            date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        
        # Insert or update in database
        result = customer_stats.update_one(
            {'date': date_obj},
            {'$set': {
                'date': date_obj,
                'customerCount': customer_count,
                'updated_at': datetime.now()
            }},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Customer data added successfully",
            "date": date_obj.isoformat(),
            "customerCount": customer_count,
            "upserted_id": str(result.upserted_id) if result.upserted_id else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding customer data: {str(e)}")

# Keep the old monthly prediction endpoint for backward compatibility
@app.post("/predict")
async def predict_customers(data: dict = None):
    """Legacy endpoint - now redirects to daily predictions"""
    try:
        # Instead of monthly predictions, return next day prediction
        if not CUSTOMER_MODEL_LOADED:
            raise HTTPException(status_code=503, detail="Customer prediction model not loaded")
        
        if customer_stats is None:
            raise HTTPException(status_code=503, detail="Database connection failed")
        
        prediction = customer_service.predict_next_day()
        
        return {
            "success": True,
            "message": "Using daily prediction (legacy endpoint)",
            "prediction": prediction,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

import uvicorn
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=7860)