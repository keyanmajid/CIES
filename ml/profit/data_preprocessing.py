import pandas as pd
import numpy as np

def load_and_preprocess_data(file_path):
    """
    Load and preprocess data with proper profit calculation
    """
    # Load data
    df = pd.read_csv(file_path)
    df = df.ffill()
    
    # Convert date
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'])
        df['month'] = df['Date'].dt.month
        df['day_of_week'] = df['Date'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        print("Date features created from 'Date' column")
    
    # PROPER PROFIT CALCULATION - Use profit margin instead of absolute profit
    if 'Sales' in df.columns and 'cogs' in df.columns:
        # Calculate actual profit and profit margin
        df['profit'] = df['Sales'] - df['cogs']
        df['profit_margin'] = (df['profit'] / df['Sales']) * 100
        print("Created 'profit' as Sales - cogs and 'profit_margin' as percentage")
    elif 'gross income' in df.columns and 'Sales' in df.columns:
        # Use gross income as profit and calculate margin
        df['profit'] = df['gross income']
        df['profit_margin'] = (df['profit'] / df['Sales']) * 100
        print("Using 'gross income' as profit and calculated profit margin")
    else:
        # Fallback: estimate profit margin
        df['profit_margin'] = 25.0  # Assume 25% margin
        df['profit'] = df['Sales'] * 0.25 if 'Sales' in df.columns else 0
        print("Using estimated 25% profit margin")
    
    print(f"Sales stats: min=${df['Sales'].min():.2f}, max=${df['Sales'].max():.2f}, mean=${df['Sales'].mean():.2f}")
    print(f"Profit Margin stats: min={df['profit_margin'].min():.2f}%, max={df['profit_margin'].max():.2f}%, mean={df['profit_margin'].mean():.2f}%")
    
    return df

def prepare_features_for_db_compatibility(df):
    """
    Prepare features that ONLY use data available in your database
    Predict PROFIT MARGIN (%) instead of absolute profit
    """
    if 'profit_margin' not in df.columns:
        print("Error: 'profit_margin' column not found!")
        return None, None
    
    features = []
    feature_names = []
    
    # 1. Sales amount (but we'll use it carefully)
    if 'Sales' in df.columns:
        # Use log of sales to reduce linear relationship
        df['log_sales'] = np.log1p(df['Sales'])
        features.append(df['log_sales'].values)
        feature_names.append('log_sales')
    
    # 2. Date features
    if 'month' in df.columns:
        features.append(df['month'].values)
        feature_names.append('month')
    
    if 'day_of_week' in df.columns:
        features.append(df['day_of_week'].values)
        feature_names.append('day_of_week')
    
    if 'is_weekend' in df.columns:
        features.append(df['is_weekend'].values)
        feature_names.append('is_weekend')
    
    # 3. SAFE derived features
    df['is_holiday_season'] = df['month'].isin([11, 12]).astype(int)
    features.append(df['is_holiday_season'].values)
    feature_names.append('is_holiday_season')
    
    df['quarter'] = (df['month'] - 1) // 3 + 1
    features.append(df['quarter'].values)
    feature_names.append('quarter')
    
    # Sales categories (based on fixed thresholds)
    sales_bins = [0, 200, 400, 600, float('inf')]
    df['sales_category'] = pd.cut(df['Sales'], bins=sales_bins, labels=[1, 2, 3, 4]).astype(int)
    features.append(df['sales_category'].values)
    feature_names.append('sales_category')
    
    # Day type
    df['day_type'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
    features.append(df['day_type'].values)
    feature_names.append('day_type')
    
    # Add other available features that might affect profit margin
    if 'Quantity' in df.columns:
        features.append(df['Quantity'].values)
        feature_names.append('quantity')
    
    if 'Rating' in df.columns:
        features.append(df['Rating'].values)
        feature_names.append('rating')
    
    if 'Unit price' in df.columns:
        # Use price tier instead of raw price
        price_bins = [0, 30, 60, float('inf')]
        df['price_tier'] = pd.cut(df['Unit price'], bins=price_bins, labels=[1, 2, 3]).astype(int)
        features.append(df['price_tier'].values)
        feature_names.append('price_tier')
    
    # Create feature matrix
    X = np.column_stack(features)
    X_df = pd.DataFrame(X, columns=feature_names)
    y = df['profit_margin']  # Predict profit margin percentage
    
    print(f"DB-Compatible Features: {feature_names}")
    print(f"X shape: {X_df.shape}, y shape: {y.shape}")
    print(f"Target: profit_margin (%) - range: {y.min():.1f}% to {y.max():.1f}%")
    
    return X_df, y