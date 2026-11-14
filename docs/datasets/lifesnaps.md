# LifeSnaps Dataset Documentation

## 1. Overview

LifeSnaps is a longitudinal wearable dataset collected from Fitbit smartwatches and Ecological Momentary Assessment (EMA) questionnaires.

It contains physiological, behavioral and psychological measurements recorded over several months.

The dataset is used in NovaPulse as one of the main real-world data sources for building the Nova Unified Biomedical Dataset (NUBD).

---

## 2. Dataset Location

```
data/
└── raw/
    └── lifesnaps/
        └── extracted/
            └── LifeSnaps/
                └── rais_anonymized/
```

---

## 3. Dataset Structure

```
LifeSnaps/
└── rais_anonymized/
    ├── csv_rais_anonymized/
    │   ├── daily_fitbit_sema_df_unprocessed.csv
    │   └── hourly_fitbit_sema_df_unprocessed.csv
    │
    ├── mongo_rais_anonymized/
    │   ├── fitbit.bson
    │   ├── sema.bson
    │   └── surveys.bson
    │
    └── scored_surveys/
        ├── panas.csv
        ├── breq.csv
        ├── personality.csv
        ├── stai.csv
        └── ttm.csv
```

---

## 4. Files Used

Current version of NovaPulse uses only:

- daily_fitbit_sema_df_unprocessed.csv
- hourly_fitbit_sema_df_unprocessed.csv

The BSON files are not used.

The scored surveys will be integrated in future versions.

---

## 5. Daily Dataset

Filename

```
daily_fitbit_sema_df_unprocessed.csv
```

Dimensions

- 7,410 rows
- 63 columns

Contains one record per participant per day.

Main variables

### Identification

- id
- date

### Cardiovascular

- resting_hr
- rmssd
- nremhr

### Oxygenation

- spo2

### Respiration

- full_sleep_breathing_rate

### Stress

- stress_score

### Sleep

- sleep_duration
- sleep_efficiency
- minutesAsleep
- minutesAwake
- minutesToFallAsleep
- sleep_deep_ratio
- sleep_light_ratio
- sleep_rem_ratio

### Physical Activity

- steps
- calories
- distance
- activityType
- lightly_active_minutes
- moderately_active_minutes
- very_active_minutes
- sedentary_minutes

### Temperature

- nightly_temperature
- daily_temperature_variation

### Demographics

- age
- gender
- bmi

### Goals

- step_goal
- min_goal
- max_goal

### Mood Labels

- ALERT
- HAPPY
- NEUTRAL
- RESTED/RELAXED
- SAD
- TENSE/ANXIOUS
- TIRED

### Context Labels

- HOME
- HOME_OFFICE
- WORK/SCHOOL
- OUTDOORS
- GYM
- ENTERTAINMENT
- TRANSIT
- OTHER

---

## 6. Hourly Dataset

Filename

```
hourly_fitbit_sema_df_unprocessed.csv
```

Dimensions

- 159,508 rows
- 39 columns

Contains hourly physiological measurements.

Main variables

- bpm
- temperature
- calories
- distance
- steps
- activityType

Used for future high-resolution analysis.

Current NovaPulse version mainly uses the daily dataset.

---

## 7. Available Information

The dataset includes

- Resting Heart Rate
- Heart Rate Variability (RMSSD)
- SpO₂
- Respiratory Rate
- Sleep Duration
- Sleep Efficiency
- Physical Activity
- Calories
- Distance
- Stress Score
- Demographic Information
- Mood Indicators
- Context Information

---

## 8. Mapping to NUBD

| NUBD Field | LifeSnaps Column |
|------------|------------------|
| subject_id | id |
| date | date |
| resting_hr | resting_hr |
| hrv_rmssd | rmssd |
| spo2 | spo2 |
| resp_rate | full_sleep_breathing_rate |
| sleep_hours | sleep_duration |
| sleep_efficiency | sleep_efficiency |
| steps | steps |
| exercise_minutes | lightly_active_minutes + moderately_active_minutes + very_active_minutes |
| stress | stress_score |
| mood | HAPPY / SAD / ALERT / RESTED... |
| age | age |
| sex | gender |
| dataset_source | lifesnaps |

---

## 9. Missing Variables

The current LifeSnaps dataset does not directly provide

- Blood Pressure
- ECG waveform
- Continuous respiratory waveform
- Clinical diagnoses

---

## 10. Output

The parser generates

```
lifesnaps_daily.parquet
```

using the Nova Unified Biomedical Dataset (NUBD) schema.

---

## 11. Pipeline

```
CSV Files
      │
      ▼
parse_lifesnaps.py
      │
      ▼
build_daily_record_lifesnaps.py
      │
      ▼
build_lifesnaps.py
      │
      ▼
quality_checks.py
      │
      ▼
lifesnaps_daily.parquet
```