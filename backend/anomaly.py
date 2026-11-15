"""
NovaPulse Machine Learning Anomaly Detection Service (NASA Space Apps 2026)
Uses scikit-learn Isolation Forest to compute an independent multivariate
anomaly 'second opinion' per crew member trained on baseline period (Days 1-30).
"""

from __future__ import annotations
from typing import Any, Dict, List
import numpy as np
from sklearn.ensemble import IsolationForest

FEATURE_KEYS = [
    "restingHr",
    "hrv",
    "sbp",
    "dbp",
    "spo2",
    "coreTemp",
    "respRate",
    "sleepHours",
    "sleepEff",
    "exerciseMin",
    "resistanceLoad",
    "mood",
    "fatigue",
    "stress",
    "reactionMs",
    "doseMsv",
    "cabinCo2",
]


class AnomalyDetector:
    def __init__(self, contamination: float = 0.08, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self._models: Dict[str, IsolationForest] = {}

    def _extract_feature_vector(self, reading: Dict[str, Any]) -> List[float]:
        vec = []
        for k in FEATURE_KEYS:
            val = reading.get(k)
            vec.append(float(val) if val is not None else 0.0)
        return vec

    def train_and_score_crew(
        self, crew_readings: List[Dict[str, Any]], baseline_days: int = 30
    ) -> List[Dict[str, Any]]:
        """Trains Isolation Forest on baseline period (days 1..baseline_days)

        and predicts anomaly score for all days.
        """
        if not crew_readings:
            return []

        sorted_readings = sorted(crew_readings, key=lambda x: x["day"])
        crew_id = sorted_readings[0]["crewId"]

        # Baseline slice for training
        baseline_slice = [r for r in sorted_readings if r["day"] <= baseline_days]
        if len(baseline_slice) < 5:
            # Fallback if baseline is too small
            baseline_slice = sorted_readings

        X_train = np.array(
            [self._extract_feature_vector(r) for r in baseline_slice]
        )

        model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=100,
        )
        model.fit(X_train)
        self._models[crew_id] = model

        # Predict on entire mission timeline
        X_all = np.array([self._extract_feature_vector(r) for r in sorted_readings])
        raw_scores = model.decision_function(X_all)  # lower = more abnormal
        preds = model.predict(X_all)  # -1 = anomaly, 1 = normal

        # Normalize score into [0, 100] where 100 is highly anomalous
        # decision_function is roughly between -0.5 and 0.5
        min_s = min(raw_scores) if len(raw_scores) > 0 else 0
        max_s = max(raw_scores) if len(raw_scores) > 0 else 1
        rng = max_s - min_s if max_s > min_s else 1.0

        results = []
        for r, raw, pred in zip(sorted_readings, raw_scores, preds):
            normalized = (max_s - raw) / rng * 100.0  # invert so higher = more anomalous
            results.append(
                {
                    "crewId": crew_id,
                    "day": r["day"],
                    "rawScore": round(float(raw), 4),
                    "anomalyScore": round(float(normalized), 1),
                    "isAnomaly": bool(pred == -1),
                }
            )

        return results
