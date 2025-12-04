import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
import joblib
from pymongo import MongoClient
from datetime import datetime
import sys

class MongoDBRecommender:
    def __init__(self):
        # Your MongoDB URI
        self.mongo_uri = "mongodb+srv://keyanmajid57:.$iloveyou3000@cluster0.v1y4f9x.mongodb.net/cies?retryWrites=true&w=majority"
        try:
            self.client = MongoClient(self.mongo_uri)
            self.db = self.client.get_database()
            print("✅ Connected to MongoDB successfully!")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            sys.exit(1)
            
        self.product_features = {}
        self.similarity_matrix = None
        self.tfidf_vectorizer = None
        
    def load_products_from_mongodb(self):
        """Load products directly from your MongoDB database"""
        print("📊 Loading products from MongoDB...")
        
        try:
            # Access your products collection (based on your schema)
            products_collection = self.db.products
            
            # Get all products
            products = list(products_collection.find())
            
            if not products:
                print("❌ No products found in MongoDB")
                return None
                
            print(f"✅ Loaded {len(products)} products from MongoDB")
            
            # Build product features using your exact schema
            for product in products:
                product_id = str(product['_id'])
                
                # Use your exact schema fields
                name = product.get('name', '')
                category = product.get('category', '')
                tags = product.get('tags', [])
                description = product.get('description', '')
                
                # Combine all features for ML
                features_text = f"{category} {' '.join(tags)} {name} {description}"
                
                self.product_features[product_id] = {
                    'name': name,
                    'category': category,
                    'tags': tags,
                    'price': product.get('price', 0),
                    'description': description,
                    'imageUrl': product.get('imageUrl', ''),
                    'stock': product.get('stock', 0),
                    'features_text': features_text.lower().strip()
                }
            
            # Show sample of loaded products
            print("\n📦 Sample of loaded products:")
            for i, (pid, features) in enumerate(list(self.product_features.items())[:3]):
                print(f"  {i+1}. {features['name']} - {features['category']} - Tags: {features['tags']}")
            
            return self.product_features
            
        except Exception as e:
            print(f"❌ Error loading from MongoDB: {e}")
            return None
    
    def load_activities_from_mongodb(self):
        """Load user activities from MongoDB for training"""
        print("📊 Loading user activities from MongoDB...")
        
        try:
            activities_collection = self.db.activities
            
            # Get recent activities
            activities = list(activities_collection.find().limit(5000))
            
            if not activities:
                print("ℹ️ No activities found, will generate synthetic data")
                return None
                
            print(f"✅ Loaded {len(activities)} user activities from MongoDB")
            return activities
            
        except Exception as e:
            print(f"❌ Error loading activities: {e}")
            return None
    
    def train_model(self):
        """Train the ML model using MongoDB data"""
        print("🤖 Training ML Model with MongoDB Data...")
        
        # Load products
        products = self.load_products_from_mongodb()
        if not products:
            print("❌ Cannot train without products")
            return False
        
        # Load or generate user interactions
        activities = self.load_activities_from_mongodb()
        if activities:
            interactions_df = self._process_activities_to_interactions(activities)
        else:
            interactions_df = self._generate_synthetic_interactions()
        
        # Train content-based model
        self._train_content_based_model()
        
        print("✅ ML Model trained successfully with MongoDB data!")
        return True
    
    def _process_activities_to_interactions(self, activities):
        """Convert MongoDB activities to user interactions"""
        print("🔄 Processing MongoDB activities...")
        
        interactions = []
        
        for activity in activities:
            user_id = str(activity.get('userId', ''))
            product_id = str(activity.get('productId', ''))
            activity_type = activity.get('type', '')
            
            if not user_id or user_id == 'None' or not product_id or product_id not in self.product_features:
                continue
            
            # Convert activity type to implicit rating
            rating_weights = {
                'purchase': 5.0,
                'add_to_cart': 3.0, 
                'search': 1.5
            }
            
            rating = rating_weights.get(activity_type, 1.0)
            
            interactions.append({
                'user_id': user_id,
                'product_id': product_id,
                'rating': rating,
                'type': activity_type
            })
        
        interactions_df = pd.DataFrame(interactions)
        print(f"✅ Processed {len(interactions_df)} user interactions from MongoDB")
        
        if len(interactions_df) > 0:
            print("📈 Activity types distribution:")
            print(interactions_df['type'].value_counts())
        
        return interactions_df
    
    def _generate_synthetic_interactions(self):
        """Generate synthetic interactions based on your product categories"""
        print("🛠️ Generating synthetic user interactions...")
        
        interactions = []
        product_ids = list(self.product_features.keys())
        
        if not product_ids:
            return pd.DataFrame()
        
        # User segments based on your actual product categories
        user_segments = {
            'anime_fan': {
                'preferred_categories': ['Action Figure', 'Book', 'Action FIgure'],
                'preferred_tags': ['Anime', 'AOT', 'JJK', 'DBZ', 'Naruto', 'Manga', 'Action Figure'],
                'bias': 0.8
            },
            'tech_lover': {
                'preferred_categories': ['electronics', 'Laptop', 'Phone', 'Console', 'Headphone'],
                'preferred_tags': ['Tech', 'Laptop', 'Phone', 'Console', 'Gaming', 'Electronics'],
                'bias': 0.7
            },
            'fashion_lover': {
                'preferred_categories': ['fashion', 'Fashion'],
                'preferred_tags': ['Fashion', 'Clothes', 'Jacket', 'Hoodie', 'Shoes', 'Bag'],
                'bias': 0.6
            },
            'book_reader': {
                'preferred_categories': ['Book', 'Books'],
                'preferred_tags': ['Books', 'Manga', 'Comics', 'SuperHero'],
                'bias': 0.5
            }
        }
        
        for user_id in range(1, 301):  # 300 synthetic users
            user_type = np.random.choice(list(user_segments.keys()))
            profile = user_segments[user_type]
            
            # Each user interacts with 8-15 products
            num_interactions = np.random.randint(8, 15)
            
            for _ in range(num_interactions):
                product_id = np.random.choice(product_ids)
                product = self.product_features[product_id]
                
                # Base rating
                base_rating = np.random.normal(3.5, 1.0)
                
                # Apply user preference bias based on category
                if product['category'] in profile['preferred_categories']:
                    base_rating += profile['bias']
                
                # Additional bias for tag matches
                product_tags = set(tag.lower() for tag in product['tags'])
                preferred_tags = set(tag.lower() for tag in profile['preferred_tags'])
                if product_tags.intersection(preferred_tags):
                    base_rating += 0.3
                
                # Clip to 1-5 range and round
                rating = max(1.0, min(5.0, base_rating))
                rating = round(rating * 2) / 2  # Round to nearest 0.5
                
                # Determine activity type based on rating
                if rating >= 4.0:
                    activity_type = 'purchase'
                elif rating >= 3.0:
                    activity_type = 'add_to_cart'
                else:
                    activity_type = 'search'
                
                interactions.append({
                    'user_id': f'user_{user_id:03d}',
                    'product_id': product_id,
                    'rating': rating,
                    'type': activity_type,
                    'user_type': user_type
                })
        
        interactions_df = pd.DataFrame(interactions)
        print(f"✅ Generated {len(interactions_df)} synthetic user interactions")
        print("📊 User segments distribution:")
        print(interactions_df['user_type'].value_counts())
        
        return interactions_df
    
    def _train_content_based_model(self):
        """Train content-based model using product features"""
        print("🎯 Training Content-Based Model...")
        
        product_ids = list(self.product_features.keys())
        
        if not product_ids:
            print("❌ No products to train on")
            return
        
        feature_texts = [self.product_features[pid]['features_text'] for pid in product_ids]
        
        # TF-IDF for tag-based similarity
        self.tfidf_vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=800,
            ngram_range=(1, 2),
            min_df=1,
            max_df=0.85
        )
        
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(feature_texts)
        
        # Reduce dimensionality
        self.svd = TruncatedSVD(n_components=min(50, len(product_ids)-1), random_state=42)
        reduced_features = self.svd.fit_transform(tfidf_matrix)
        
        # Compute similarity matrix
        self.similarity_matrix = cosine_similarity(reduced_features)
        self.product_ids = product_ids
        
        print(f"✅ Content-Based Model trained! Similarity matrix: {self.similarity_matrix.shape}")
    
    def get_similar_products(self, product_id, top_n=10):
        """Get similar products based on tags and categories"""
        if product_id not in self.product_ids:
            print(f"❌ Product {product_id} not found in model")
            return []
        
        idx = self.product_ids.index(product_id)
        similarities = self.similarity_matrix[idx]
        
        # Get most similar products
        similar_products = []
        for i, similarity in enumerate(similarities):
            if i != idx and similarity > 0.05:  # Exclude itself and very low similarity
                similar_id = self.product_ids[i]
                product_info = self.product_features[similar_id]
                
                # Calculate tag overlap
                source_tags = set(self.product_features[product_id]['tags'])
                target_tags = set(product_info['tags'])
                tag_overlap = source_tags.intersection(target_tags)
                
                similar_products.append({
                    'product_id': similar_id,
                    'name': product_info['name'],
                    'category': product_info['category'],
                    'price': product_info['price'],
                    'similarity_score': float(similarity),
                    'matching_tags': list(tag_overlap),
                    'imageUrl': product_info.get('imageUrl', '')
                })
        
        # Sort by similarity and return top N
        similar_products.sort(key=lambda x: x['similarity_score'], reverse=True)
        return similar_products[:top_n]
    
    def get_personalized_recommendations(self, user_interactions, top_n=10):
        """Get personalized recommendations based on user's interaction history"""
        if not user_interactions:
            return self._get_popular_recommendations(top_n)
        
        # Analyze user's preferences
        user_preferred_tags = {}
        user_rated_products = set()
        
        for interaction in user_interactions:
            product_id = interaction['product_id']
            rating = interaction.get('rating', 1.0)
            user_rated_products.add(product_id)
            
            if product_id in self.product_features:
                product = self.product_features[product_id]
                for tag in product.get('tags', []):
                    user_preferred_tags[tag] = user_preferred_tags.get(tag, 0) + rating
        
        # Get top preferred tags
        top_tags = [tag for tag, score in sorted(
            user_preferred_tags.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:7]]  # Top 7 tags
        
        # Score all products user hasn't rated
        scored_products = []
        for product_id, product_info in self.product_features.items():
            if product_id not in user_rated_products:
                score = 0
                matching_tags = []
                
                # Score based on tag matches
                for tag in product_info.get('tags', []):
                    if tag in top_tags:
                        score += user_preferred_tags.get(tag, 1)
                        matching_tags.append(tag)
                
                # Add content-based similarity score
                if user_rated_products:
                    # Use similarity to user's highly rated products
                    content_score = self._calculate_content_similarity(product_id, user_rated_products)
                    score += content_score * 0.5
                
                if score > 0:
                    scored_products.append({
                        'product_id': product_id,
                        'name': product_info['name'],
                        'category': product_info['category'],
                        'price': product_info['price'],
                        'score': score,
                        'matching_tags': matching_tags,
                        'imageUrl': product_info.get('imageUrl', ''),
                        'reason': f"Matches your interest in: {', '.join(matching_tags[:3])}" if matching_tags else "Based on your activity"
                    })
        
        # Sort and return top N
        scored_products.sort(key=lambda x: x['score'], reverse=True)
        return scored_products[:top_n]
    
    def _calculate_content_similarity(self, product_id, user_rated_products):
        """Calculate content similarity with user's rated products"""
        if product_id not in self.product_ids:
            return 0
        
        target_idx = self.product_ids.index(product_id)
        total_similarity = 0
        count = 0
        
        for rated_id in user_rated_products:
            if rated_id in self.product_ids:
                rated_idx = self.product_ids.index(rated_id)
                similarity = self.similarity_matrix[target_idx][rated_idx]
                total_similarity += similarity
                count += 1
        
        return total_similarity / count if count > 0 else 0
    
    def _get_popular_recommendations(self, top_n):
        """Fallback to diverse recommendations"""
        # Return products from different categories
        categories = {}
        recommendations = []
        
        for product_id, product_info in self.product_features.items():
            category = product_info['category']
            if category not in categories:
                categories[category] = []
            categories[category].append({
                'product_id': product_id,
                'name': product_info['name'],
                'category': category,
                'price': product_info['price'],
                'score': 1.0,
                'reason': f"Popular in {category}",
                'imageUrl': product_info.get('imageUrl', '')
            })
        
        # Take 1-2 products from each category
        for category_products in categories.values():
            recommendations.extend(category_products[:2])
        
        return recommendations[:top_n]
    
    def save_model(self, filepath='trained_recommender.pkl'):
        """Save trained model"""
        model_data = {
            'product_features': self.product_features,
            'similarity_matrix': self.similarity_matrix,
            'product_ids': self.product_ids,
            'tfidf_vectorizer': self.tfidf_vectorizer,
            'svd': self.svd,
            'timestamp': datetime.now().isoformat()
        }
        joblib.dump(model_data, filepath)
        print(f"💾 Model saved to {filepath}")
    
    def load_model(self, filepath='trained_recommender.pkl'):
        """Load trained model"""
        model_data = joblib.load(filepath)
        self.product_features = model_data['product_features']
        self.similarity_matrix = model_data['similarity_matrix']
        self.product_ids = model_data['product_ids']
        self.tfidf_vectorizer = model_data['tfidf_vectorizer']
        self.svd = model_data['svd']
        print("🔧 Model loaded successfully!")

# Main execution
def main():
    print("🚀 Starting MongoDB Recommendation System...")
    
    # Initialize and train
    recommender = MongoDBRecommender()
    
    # Train the model with MongoDB data
    success = recommender.train_model()
    
    if success:
        # Save the model
        recommender.save_model()
        
        # Test recommendations
        print("\n🧪 Testing recommendations...")
        product_ids = list(recommender.product_features.keys())
        
        if product_ids:
            # Test similar products
            sample_product = product_ids[0]
            similar = recommender.get_similar_products(sample_product, 5)
            
            print(f"\n🔄 Products similar to '{recommender.product_features[sample_product]['name']}':")
            for i, product in enumerate(similar, 1):
                print(f"{i}. {product['name']} (Score: {product['similarity_score']:.3f})")
                print(f"   Tags: {product['matching_tags']}")
            
            # Test personalized recommendations
            print(f"\n🎯 Testing personalized recommendations...")
            sample_interactions = [
                {'product_id': product_ids[0], 'rating': 5.0},
                {'product_id': product_ids[1], 'rating': 4.5},
            ]
            personalized = recommender.get_personalized_recommendations(sample_interactions, 5)
            
            print("Personalized recommendations:")
            for i, product in enumerate(personalized, 1):
                print(f"{i}. {product['name']} (Score: {product['score']:.2f})")
                print(f"   Reason: {product['reason']}")
        
        print(f"\n✅ Training completed! Model ready for use.")
        print(f"📊 Products in model: {len(recommender.product_features)}")
        print(f"🔗 Use with FastAPI service: python fastapi_service.py")

if __name__ == "__main__":
    main()