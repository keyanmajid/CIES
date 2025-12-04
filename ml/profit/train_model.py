import json
import os
import numpy as np
from datetime import datetime
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error

MODEL_FILE = "model_package.json"
POLY_DEGREE = 8   # Best setting for your daily data


def days_from_base(base_date, dates):
    return np.array([(d - base_date).days for d in dates]).reshape(-1, 1)


def train_model(dates, sales):
    if len(dates) != len(sales):
        raise ValueError("Dates and sales list lengths do not match.")

    base_date = dates[0]
    X = days_from_base(base_date, dates)
    y = np.array(sales)

    poly = PolynomialFeatures(degree=POLY_DEGREE)
    X_poly = poly.fit_transform(X)

    model = LinearRegression()
    model.fit(X_poly, y)

    preds = model.predict(X_poly)

    r2 = r2_score(y, preds)
    mae = mean_absolute_error(y, preds)

    model_package = {
        "base_date_iso": base_date.isoformat(),
        "poly_degree": POLY_DEGREE,
        "coef": model.coef_.tolist(),
        "intercept": float(model.intercept_)
    }

    with open(MODEL_FILE, "w") as f:
        json.dump(model_package, f)

    return {
        "trained_samples": len(sales),
        "r2": r2,
        "mae": mae,
        "base_date": base_date.isoformat(),
        "model_path": MODEL_FILE
    }


def load_model_package():
    if not os.path.isfile(MODEL_FILE):
        return None
    with open(MODEL_FILE, "r") as f:
        return json.load(f)


def predict_dates(target_dates, model_pkg):
    base_date = datetime.fromisoformat(model_pkg["base_date_iso"])
    degree = model_pkg["poly_degree"]
    coef = np.array(model_pkg["coef"])
    intercept = float(model_pkg["intercept"])

    poly = PolynomialFeatures(degree=degree)
    X = days_from_base(base_date, target_dates)
    X_poly = poly.fit_transform(X)

    preds = X_poly.dot(coef) + intercept
    return preds
