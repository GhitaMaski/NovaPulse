from pathlib import Path
import joblib
import pandas as pd

# ============================================
# PATHS
# ============================================

MODEL_DIR = Path(__file__).parent / "saved_models"

# ============================================
# LOAD MODELS (une seule fois)
# ============================================

health_model = joblib.load(MODEL_DIR / "health_model.pkl")
fatigue_model = joblib.load(MODEL_DIR / "fatigue_model.pkl")
cardio_model = joblib.load(MODEL_DIR / "cardio_model.pkl")
sleep_model = joblib.load(MODEL_DIR / "sleep_model.pkl")
mission_model = joblib.load(MODEL_DIR / "mission_status_model.pkl")
anomaly_model = joblib.load(MODEL_DIR / "anomaly_model.pkl")
feature_columns = joblib.load(MODEL_DIR / "feature_columns.pkl")

print("All AI models loaded.")


# ============================================
# PREDICTION FUNCTION
# ============================================

def predict(features: dict):
    """
    features = {
        "recovery_score": ...,
        "recovery_trend": ...,
        ...
    }
    """
    X = pd.DataFrame([features])

    # Vérifie que toutes les colonnes existent
    missing = set(feature_columns) - set(X.columns)

    if missing:
        raise ValueError(f"Missing features: {missing}")

    # Réordonner les colonnes
    X = X[feature_columns]

    health = float(health_model.predict(X)[0])
    fatigue = float(fatigue_model.predict(X)[0])
    cardio = float(cardio_model.predict(X)[0])
    sleep = float(sleep_model.predict(X)[0])
    mission = str(mission_model.predict(X)[0])
    anomaly = int(anomaly_model.predict(X)[0])

    if anomaly == -1:
        anomaly_status = "Anomaly Detected"
    else:
        anomaly_status = "Normal"

    return {
        "health_score": round(health, 2),
        "fatigue_risk": round(fatigue, 3),
        "cardio_risk": round(cardio, 3),
        "sleep_risk": round(sleep, 3),
        "mission_status": mission,
        "anomaly": anomaly_status,
    }


# ============================================
# TEST
# ============================================

if __name__ == "__main__":

    sample = {

        "recovery_score": 0.45,
        "recovery_trend": 0.05,
        "cardiac_state": 0.40,
        "hr_variability": 65,
        "activity_score": 0.60,
        "activity_change": 0.20,
        "stress_index": 0.35,
        "stress_variability": 0.20,
        "cognitive_load": 0.40,
        "alpha_beta_ratio": 1.20,
        "theta_alpha_ratio": 0.80,
        "gsr_variability": 0.30,
        "resp_variability": 0.20,
        "has_recovery_data": 1,
        "has_activity_data": 1,
        "has_eeg_data": 1,
        "has_gsr_data": 1,
        "has_resp_data": 1,
        "source_encoded": 0,
        "mission_day": 50,
        "heart_rate": 72,
        "spo2": 98,
        "body_temperature": 36.9,
        "systolic_bp": 118,
        "diastolic_bp": 76,
        "sleep_hours": 7.8,
        "sleep_quality": 88,
        "sleep_efficiency": 92,
        "sleep_debt": 0.2,
        "cabin_co2": 850,
        "microgravity_days": 50,
        "muscle_loss_index": 0.15,
        "bone_density_risk": 0.20,
        "radiation_dose": 42,
        "radiation_risk": 0.25

    }

    result = predict(sample)

    print(result)