from pathlib import Path
import joblib
import pandas as pd

from sklearn.ensemble import (
    RandomForestRegressor,
    RandomForestClassifier,
    IsolationForest
)

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_absolute_error,
    r2_score,
    accuracy_score
)


# ======================================================
# CONFIGURATION
# ======================================================

DATASET_PATH = r"C:\Users\HP\Desktop\Novapulse\Novapulse\data\processed\novapulse_ai_dataset.parquet"
SAVE_DIR = Path("ai_engine/models/saved_models")

SAVE_DIR.mkdir(parents=True, exist_ok=True)


# ======================================================
# LOAD DATASET
# ======================================================

print("=" * 60)
print("Loading dataset...")
print("=" * 60)

df = pd.read_parquet(DATASET_PATH)

print(df.shape)


# ======================================================
# FEATURES
# ======================================================

TARGETS = [
    "health_score",
    "fatigue_risk",
    "cardio_risk",
    "sleep_risk",
    "mission_status"
]

FEATURES = df.drop(columns=TARGETS).copy()
# Sauvegarder l'ordre des colonnes
joblib.dump(
    list(FEATURES.columns),
    SAVE_DIR / "feature_columns.pkl"
)

print("\nNumber of features :", FEATURES.shape[1])


# ======================================================
# TRAIN REGRESSION MODEL
# ======================================================

def train_regression(target, filename):

    print("\n--------------------------------")
    print(f"Training {target}")
    print("--------------------------------")

    X = FEATURES
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=300,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    pred = model.predict(X_test)

    print("MAE :", round(mean_absolute_error(y_test, pred), 4))
    print("R²  :", round(r2_score(y_test, pred), 4))

    joblib.dump(model, SAVE_DIR / filename)

    print("Saved :", filename)


# ======================================================
# TRAIN CLASSIFIER
# ======================================================

def train_classifier():

    print("\n--------------------------------")
    print("Training mission_status")
    print("--------------------------------")

    X = FEATURES
    y = df["mission_status"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=300,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    pred = model.predict(X_test)

    print("Accuracy :", round(accuracy_score(y_test, pred), 4))

    joblib.dump(
        model,
        SAVE_DIR / "mission_status_model.pkl"
    )

    print("Saved : mission_status_model.pkl")



# ======================================================
# TRAIN ANOMALY MODEL
# ======================================================

def train_anomaly():

    print("\n--------------------------------")
    print("Training anomaly detector")
    print("--------------------------------")

    model = IsolationForest(

        contamination=0.05,

        random_state=42

    )

    model.fit(FEATURES)

    joblib.dump(
        model,
        SAVE_DIR / "anomaly_model.pkl"
    )

    print("Saved : anomaly_model.pkl")

    print("\nFeature columns saved.")
# ======================================================
# MAIN
# ======================================================

if __name__ == "__main__":

    train_regression(
        "health_score",
        "health_model.pkl"
    )

    train_regression(
        "fatigue_risk",
        "fatigue_model.pkl"
    )

    train_regression(
        "cardio_risk",
        "cardio_model.pkl"
    )

    train_regression(
        "sleep_risk",
        "sleep_model.pkl"
    )

    train_classifier()

    train_anomaly()

    print("\n" + "=" * 60)
    print("ALL MODELS TRAINED SUCCESSFULLY")
    print("=" * 60)