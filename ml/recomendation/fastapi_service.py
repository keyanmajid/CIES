from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import joblib
from pymongo import MongoClient
import numpy as np

app = FastAPI(
    title="CIES Recommendation API",
    description="ML-powered recommendations using your MongoDB data",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# MongoDB connection
MONGO_URI = "mongodb+srv://keyanmajid57:.$iloveyou3000@cluster0.v1y4f9x.mongodb.net/cies?retryWrites=true&w=majority"
try:
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client.get_database()
    print("✅ Connected to MongoDB successfully!")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    mongo_client = None

# Load trained model
try:
    model_data = joblib.load('trained_recommender.pkl')
    print("✅ ML Model loaded successfully!")
    print(f"📦 Products in model: {len(model_data['product_features'])}")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    model_data = None

class RecommendationRequest(BaseModel):
    user_id: str
    top_n: int = 10

class SimilarProductsRequest(BaseModel):
    product_id: str
    top_n: int = 10

class RecommendationResponse(BaseModel):
    success: bool
    recommendations: List[Dict]
    algorithm: str
    count: int

@app.get("/")
async def root():
    return {
        "message": "CIES Recommendation API", 
        "status": "active",
        "products_loaded": len(model_data['product_features']) if model_data else 0,
        "mongodb_connected": mongo_client is not None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model_data is not None,
        "mongodb_connected": mongo_client is not None,
        "products_count": len(model_data['product_features']) if model_data else 0
    }

@app.post("/recommend/personalized", response_model=RecommendationResponse)
async def get_personalized_recommendations(request: RecommendationRequest):
    """Get personalized recommendations based on user's MongoDB activity history"""
    if model_data is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")
    
    if mongo_client is None:
        raise HTTPException(status_code=503, detail="MongoDB not connected")
    
    try:
        # Get user's activities from MongoDB
        user_activities = get_user_activities_from_mongodb(request.user_id)
        
        recommendations = generate_personalized_recommendations(
            request.user_id, 
            user_activities, 
            request.top_n
        )
        
        return RecommendationResponse(
            success=True,
            recommendations=recommendations,
            algorithm="personalized_tag_based",
            count=len(recommendations)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

@app.post("/recommend/similar", response_model=RecommendationResponse)
async def get_similar_products(request: SimilarProductsRequest):
    """Get similar products based on tags and categories"""
    if model_data is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")
    
    try:
        recommendations = generate_similar_products(
            request.product_id, 
            request.top_n
        )
        
        return RecommendationResponse(
            success=True,
            recommendations=recommendations,
            algorithm="content_based_tags",
            count=len(recommendations)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similar products failed: {str(e)}")

@app.get("/products")
async def get_all_products():
    """Get all products from the model"""
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    products = []
    for product_id, features in model_data['product_features'].items():
        products.append({
            'product_id': product_id,
            'name': features.get('name', 'Unknown'),
            'category': features.get('category', 'Unknown'),
            'price': features.get('price', 0),
            'tags': features.get('tags', []),
            'imageUrl': features.get('imageUrl', '')
        })
    
    return {"products": products, "count": len(products)}

@app.get("/products/{product_id}")
async def get_product(product_id: str):
    """Get specific product details"""
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if product_id not in model_data['product_features']:
        raise HTTPException(status_code=404, detail="Product not found in model")
    
    product = model_data['product_features'][product_id]
    return {
        'product_id': product_id,
        'name': product.get('name', 'Unknown'),
        'category': product.get('category', 'Unknown'),
        'price': product.get('price', 0),
        'tags': product.get('tags', []),
        'description': product.get('description', ''),
        'imageUrl': product.get('imageUrl', '')
    }

def get_user_activities_from_mongodb(user_id):
    """Get user's activities from MongoDB"""
    if not mongo_client:
        return []
    
    try:
        activities = list(db.activities.find(
            {"userId": user_id}
        ).sort("createdAt", -1).limit(50))  # Last 50 activities
        
        # Convert to interaction format
        user_interactions = []
        for activity in activities:
            product_id = str(activity.get('productId', ''))
            activity_type = activity.get('type', '')
            
            if product_id and product_id in model_data['product_features']:
                # Convert activity type to rating
                rating_weights = {
                    'purchase': 5.0,
                    'add_to_cart': 3.0,
                    'search': 1.5
                }
                
                rating = rating_weights.get(activity_type, 1.0)
                
                user_interactions.append({
                    'product_id': product_id,
                    'rating': rating,
                    'type': activity_type
                })
        
        print(f"📊 Found {len(user_interactions)} activities for user {user_id}")
        return user_interactions
        
    except Exception as e:
        print(f"❌ Error getting user activities: {e}")
        return []

def generate_personalized_recommendations(user_id, user_activities, top_n):
    """Generate personalized recommendations based on MongoDB activities"""
    if not user_activities:
        return get_diverse_recommendations(top_n)
    
    # Analyze user preferences from MongoDB activities
    user_preferred_tags = {}
    user_rated_products = set()
    
    for activity in user_activities:
        product_id = activity['product_id']
        rating = activity['rating']
        user_rated_products.add(product_id)
        
        if product_id in model_data['product_features']:
            product = model_data['product_features'][product_id]
            for tag in product.get('tags', []):
                user_preferred_tags[tag] = user_preferred_tags.get(tag, 0) + rating
    
    # Get top preferred tags
    top_tags = [tag for tag, score in sorted(
        user_preferred_tags.items(), 
        key=lambda x: x[1], 
        reverse=True
    )[:7]]  # Top 7 tags
    
    print(f"🎯 User {user_id} prefers tags: {top_tags}")
    
    # Score all products user hasn't interacted with
    scored_products = []
    for product_id, product in model_data['product_features'].items():
        if product_id not in user_rated_products:
            score = 0
            matching_tags = []
            
            # Score based on tag matches
            for tag in product.get('tags', []):
                if tag in top_tags:
                    score += user_preferred_tags.get(tag, 1)
                    matching_tags.append(tag)
            
            if score > 0:
                scored_products.append({
                    'product_id': product_id,
                    'name': product.get('name', 'Unknown'),
                    'category': product.get('category', 'Unknown'),
                    'price': product.get('price', 0),
                    'score': round(score, 2),
                    'matching_tags': matching_tags,
                    'imageUrl': product.get('imageUrl', ''),
                    'reason': f"Matches your interest in: {', '.join(matching_tags[:3])}" if matching_tags else "Based on your activity"
                })
    
    # Sort and return top N
    scored_products.sort(key=lambda x: x['score'], reverse=True)
    return scored_products[:top_n]

def generate_similar_products(product_id, top_n):
    """Generate similar products based on tags"""
    if product_id not in model_data['product_ids']:
        return []
    
    idx = model_data['product_ids'].index(product_id)
    similarities = model_data['similarity_matrix'][idx]
    
    # Get similar products
    similar_products = []
    for i, similarity in enumerate(similarities):
        if i != idx and similarity > 0.1:
            similar_id = model_data['product_ids'][i]
            product_info = model_data['product_features'][similar_id]
            
            # Calculate tag overlap
            source_tags = set(model_data['product_features'][product_id]['tags'])
            target_tags = set(product_info['tags'])
            tag_overlap = source_tags.intersection(target_tags)
            
            similar_products.append({
                'product_id': similar_id,
                'name': product_info.get('name', 'Unknown'),
                'category': product_info.get('category', 'Unknown'),
                'price': product_info.get('price', 0),
                'similarity_score': round(float(similarity), 3),
                'matching_tags': list(tag_overlap),
                'imageUrl': product_info.get('imageUrl', ''),
                'reason': f"Similar tags: {', '.join(list(tag_overlap)[:3])}" if tag_overlap else "Content-based match"
            })
    
    # Sort by similarity and return top N
    similar_products.sort(key=lambda x: x['similarity_score'], reverse=True)
    return similar_products[:top_n]

def get_diverse_recommendations(top_n):
    """Fallback to diverse recommendations from different categories"""
    categories = {}
    recommendations = []
    
    for product_id, product in model_data['product_features'].items():
        category = product['category']
        if category not in categories:
            categories[category] = []
        categories[category].append({
            'product_id': product_id,
            'name': product.get('name', 'Unknown'),
            'category': category,
            'price': product.get('price', 0),
            'score': 1.0,
            'reason': f"Popular in {category}",
            'imageUrl': product.get('imageUrl', '')
        })
    
    # Take 1-2 products from each category
    for category_products in categories.values():
        recommendations.extend(category_products[:2])
    
    return recommendations[:top_n]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, reload=True)