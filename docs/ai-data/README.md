# NovaPulse AI Engine

NASA Space Apps Challenge 2026 – NovaPulse

---

# Overview

The NovaPulse AI Engine predicts an astronaut's health condition using physiological, environmental, and mission-related data.

The AI engine consists of six pre-trained machine learning models that are automatically loaded when the module is imported.

The backend only needs to call a single function:

```python
from ai_engine.models.predict import predict
```

No model training is required during inference.

---

# Project Structure

```text
ai_engine/
└── models/
    ├── predict.py
    ├── train.py
    └── saved_models/
        ├── health_model.pkl
        ├── fatigue_model.pkl
        ├── cardio_model.pkl
        ├── sleep_model.pkl
        ├── mission_status_model.pkl
        ├── anomaly_model.pkl
        └── feature_columns.pkl
```

---

# Requirements

Python 3.11+

Install all dependencies:

```bash
pip install -r requirements.txt
```

Main libraries:

- pandas
- numpy
- scikit-learn
- joblib
- pyarrow

---

# Training

To retrain all models:

```bash
python ai_engine/models/train.py
```

The training pipeline:

- Loads the processed dataset
- Trains all machine learning models
- Saves trained models into `saved_models/`
- Generates `feature_columns.pkl`

Training is only required when new models need to be created.

---

# Prediction

Import:

```python
from ai_engine.models.predict import predict
```

Usage:

```python
result = predict(features)
```

where `features` is a Python dictionary.

---

# Required Input Features

The prediction function expects the following fields.

| Feature | Type | Unit | Example |
|----------|------|------|---------|
| recovery_score | float | score | 82.4 |
| recovery_trend | float | score | 0.15 |
| cardiac_state | float | encoded | 1 |
| hr_variability | float | ms | 54.2 |
| activity_score | float | score | 81 |
| activity_change | float | score | -3.1 |
| stress_index | float | score | 0.32 |
| stress_variability | float | score | 0.08 |
| cognitive_load | float | score | 0.45 |
| alpha_beta_ratio | float | ratio | 1.21 |
| theta_alpha_ratio | float | ratio | 0.81 |
| gsr_variability | float | score | 0.28 |
| resp_variability | float | score | 0.12 |
| has_recovery_data | bool | boolean | true |
| has_activity_data | bool | boolean | true |
| has_eeg_data | bool | boolean | false |
| has_gsr_data | bool | boolean | true |
| has_resp_data | bool | boolean | true |
| source_encoded | integer | encoded | 0 |
| mission_day | integer | day | 54 |
| heart_rate | float | bpm | 72 |
| spo2 | float | % | 98 |
| body_temperature | float | °C | 36.8 |
| systolic_bp | float | mmHg | 118 |
| diastolic_bp | float | mmHg | 76 |
| sleep_hours | float | hours | 7.4 |
| sleep_quality | float | score | 87 |
| sleep_efficiency | float | % | 92 |
| sleep_debt | float | hours | 0.5 |
| cabin_co2 | float | ppm | 820 |
| microgravity_days | integer | days | 34 |
| muscle_loss_index | float | score | 0.18 |
| bone_density_risk | float | score | 0.14 |
| radiation_dose | float | mSv | 5.8 |
| radiation_risk | float | score | 0.09 |

---

# Input Example

```python
features = {
    "recovery_score": 82.4,
    "recovery_trend": 0.15,
    "cardiac_state": 1,
    "hr_variability": 54.2,
    "activity_score": 81,
    "activity_change": -3.1,
    "stress_index": 0.32,
    "stress_variability": 0.08,
    "cognitive_load": 0.45,
    "alpha_beta_ratio": 1.21,
    "theta_alpha_ratio": 0.81,
    "gsr_variability": 0.28,
    "resp_variability": 0.12,
    "has_recovery_data": True,
    "has_activity_data": True,
    "has_eeg_data": False,
    "has_gsr_data": True,
    "has_resp_data": True,
    "source_encoded": 0,
    "mission_day": 54,
    "heart_rate": 72,
    "spo2": 98,
    "body_temperature": 36.8,
    "systolic_bp": 118,
    "diastolic_bp": 76,
    "sleep_hours": 7.4,
    "sleep_quality": 87,
    "sleep_efficiency": 92,
    "sleep_debt": 0.5,
    "cabin_co2": 820,
    "microgravity_days": 34,
    "muscle_loss_index": 0.18,
    "bone_density_risk": 0.14,
    "radiation_dose": 5.8,
    "radiation_risk": 0.09
}
```

Prediction:

```python
from ai_engine.models.predict import predict

result = predict(features)
```

---

# Output

The prediction function returns a Python dictionary.

Example:

```json
{
  "health_score": 74.41,
  "fatigue_risk": 0.174,
  "cardio_risk": 0.238,
  "sleep_risk": 0.119,
  "mission_status": "NORMAL",
  "anomaly": "Normal"
}
```

Output fields:

| Field | Type | Description |
|--------|------|-------------|
| health_score | float | Overall health score |
| fatigue_risk | float | Fatigue prediction |
| cardio_risk | float | Cardiovascular risk |
| sleep_risk | float | Sleep-related risk |
| mission_status | string | Mission status classification |
| anomaly | string | Anomaly detection result |

Depending on future versions of the AI engine, additional metadata may be returned (confidence score, inference time, model version, etc.).

---

# Backend Integration

Example using FastAPI:

```python
from fastapi import APIRouter
from ai_engine.models.predict import predict

router = APIRouter()

@router.post("/predict")
def predict_health(payload: dict):
    return predict(payload)
```

The backend should:

1. Receive data from the frontend.
2. Validate the request.
3. Build the feature dictionary.
4. Call `predict(features)`.
5. Return the prediction as JSON.

No preprocessing or model loading is required inside the backend.

---

# Error Handling

The prediction function may raise exceptions if:

- A required feature is missing.
- A feature has an invalid type.
- A trained model cannot be loaded.
- `feature_columns.pkl` is missing.

The backend should return appropriate HTTP error codes (400 or 500) depending on the error.

---

# Models

| Model | Purpose |
|--------|---------|
| health_model.pkl | Overall health prediction |
| fatigue_model.pkl | Fatigue risk prediction |
| cardio_model.pkl | Cardiovascular risk prediction |
| sleep_model.pkl | Sleep risk prediction |
| mission_status_model.pkl | Mission status classification |
| anomaly_model.pkl | Physiological anomaly detection |

All models are stored using Git LFS because of their size.

---

# Notes

- Models are loaded only once during module import.
- Input features are automatically ordered before inference.
- Feature ordering is handled internally.
- Backend developers should not modify the prediction pipeline.
- The frontend only communicates with the backend API.
- The backend is the only component that directly interacts with the AI engine.

---

# Authors

NovaPulse AI Team