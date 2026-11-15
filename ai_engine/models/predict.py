from pathlib import Path
import joblib
import pandas as pd

# ============================================
# PATHS
# ============================================

MODEL_DIR = Path(__file__).parent / "saved_models"

MODEL_FILES = {
    "health_score": "health_model.pkl",
    "fatigue_risk": "fatigue_model.pkl",
    "cardio_risk": "cardio_model.pkl",
    "sleep_risk": "sleep_model.pkl",
    "mission_status": "mission_status_model.pkl",
    "anomaly": "anomaly_model.pkl",
}
feature_columns = joblib.load(MODEL_DIR / "feature_columns.pkl")


# ============================================
# PREDICTION FUNCTION
# ============================================

def predict_batch(rows: list[dict]) -> list[dict]:
    """Run each estimator once over the batch and keep the input row order."""
    if not rows:
        return []
    data = pd.DataFrame(rows)
    missing = set(feature_columns) - set(data.columns)

    if missing:
        raise ValueError(f"Missing features: {missing}")

    data = data[feature_columns]
    results = [{} for _ in rows]
    # Release each model before loading the next one on the shared cloud worker.
    for name, filename in MODEL_FILES.items():
        model = joblib.load(MODEL_DIR / filename)
        values = model.predict(data)
        del model
        for result, value in zip(results, values, strict=True):
            if name == "mission_status":
                result[name] = str(value)
            elif name == "anomaly":
                result[name] = "Anomaly Detected" if value == -1 else "Normal"
            else:
                result[name] = round(float(value), 2 if name == "health_score" else 3)
    return results


def predict(features: dict) -> dict:
    return predict_batch([features])[0]


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
