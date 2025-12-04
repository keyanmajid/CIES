# train_sales_model_5days.py
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression

# ------------------------------
# Load CSV
# ------------------------------
df = pd.read_csv("SuperMarket Analysis.csv")

# ------------------------------
# Ensure proper column names
# ------------------------------
df = df.rename(columns={
    "gross income": "profit",
    "Unit price": "unit_price",
    "Rating": "rating",
    "Sales": "sales",
    "cogs": "cogs"
})

# ------------------------------
# Create lagged features: previous 5 days' sales
# ------------------------------
for i in range(1, 6):
    df[f'lag{i}'] = df['sales'].shift(i)

df.dropna(inplace=True)  # Remove first 5 rows with NaN

# ------------------------------
# Features & target
# ------------------------------
X = df[['lag1', 'lag2', 'lag3', 'lag4', 'lag5', 'cogs', 'rating']]  # last 5 days + cogs + rating
y = df['sales']  # target = today's sales

# ------------------------------
# Train/test split
# ------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ------------------------------
# Train Linear Regression
# ------------------------------
model = LinearRegression()
model.fit(X_train, y_train)

# ------------------------------
# Save model
# ------------------------------
joblib.dump(model, "sales_model_5days.pkl")
print("Model trained and saved as sales_model_5days.pkl")
