# NovaPulse
NASA Space Apps 2026 - NovaPulse
# NovaPulse AI Engine

## Overview

The NovaPulse AI Engine is responsible for predicting an astronaut's health condition based on physiological, environmental, and mission-related data.

The module loads pre-trained machine learning models and exposes a single prediction function that can be integrated into the backend API.

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

Install dependencies:

```bash
pip install -r requirements.txt
```

Main dependencies:

- pandas
- numpy
- scikit-learn
- joblib
- pyarrow

---

# Training Models

To retrain all models:

```bash
python ai_engine/models/train.py
```

This script:

- Loads the processed dataset
- Trains all machine learning models
- Saves the trained models into `saved_models/`
- Saves `feature_columns.pkl`

---

# Prediction

Import the prediction function:

```python
from ai_engine.models.predict import predict
```

Call:

```python
result = predict(features)
```

where `features` is a Python dictionary containing the required input variables.

---

# Required Input Features

The prediction function expects the following features:

- recovery_score
- recovery_trend
- cardiac_state
- hr_variability
- activity_score
- activity_change
- stress_index
- stress_variability
- cognitive_load
- alpha_beta_ratio
- theta_alpha_ratio
- gsr_variability
- resp_variability
- has_recovery_data
- has_activity_data
- has_eeg_data
- has_gsr_data
- has_resp_data
- source_encoded
- mission_day
- heart_rate
- spo2
- body_temperature
- systolic_bp
- diastolic_bp
- sleep_hours
- sleep_quality
- sleep_efficiency
- sleep_debt
- cabin_co2
- microgravity_days
- muscle_loss_index
- bone_density_risk
- radiation_dose
- radiation_risk

---

# Example

```python
from ai_engine.models.predict import predict

features = {
    "heart_rate": 72,
    "spo2": 98,
    ...
}

result = predict(features)

print(result)
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

Depending on the version of `predict.py`, additional fields such as overall risk, confidence scores, timestamps, model version, or inference time may also be included.

---

# Models

The AI engine uses six trained models:

| Model | Purpose |
|-------|---------|
| health_model.pkl | Predict overall health score |
| fatigue_model.pkl | Predict fatigue risk |
| cardio_model.pkl | Predict cardiovascular risk |
| sleep_model.pkl | Predict sleep risk |
| mission_status_model.pkl | Predict mission status |
| anomaly_model.pkl | Detect abnormal physiological patterns |

---

# Notes

- All models are loaded only once when the module is imported.
- Input features are automatically ordered before inference.
- Missing required features raise an exception.
- The backend only needs to call the `predict()` function.
- The frontend consumes the JSON returned by the backend.

---

# Authors

NovaPulse AI Teamcccc