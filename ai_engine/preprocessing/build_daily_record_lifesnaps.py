"""
build_daily_record_lifesnaps.py

Construit les enregistrements journaliers (NUBD)
à partir des données LifeSnaps.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def build_daily_record(subject_id: str, subject_data: dict) -> list[dict]:
    """
    Construit une liste d'enregistrements journaliers
    pour un utilisateur LifeSnaps.

    Parameters
    ----------
    subject_id : str
        Identifiant de l'utilisateur.

    subject_data : dict
        {
            "daily": DataFrame,
            "hourly": DataFrame
        }

    Returns
    -------
    list[dict]
        Une liste d'enregistrements NUBD.
    """

    daily = subject_data.get("daily", pd.DataFrame())

    if daily.empty:
        return []

    records = []

    for _, row in daily.iterrows():

        # ======================================================
        # Minutes d'activité
        # ======================================================

        exercise_minutes = (
            row.get("lightly_active_minutes", 0)
            + row.get("moderately_active_minutes", 0)
            + row.get("very_active_minutes", 0)
        )

        # Gestion des NaN
        if pd.isna(exercise_minutes):
            exercise_minutes = np.nan

        # ======================================================
        # Sommeil
        # ======================================================

        sleep_duration = row.get("sleep_duration", np.nan)

        if pd.notna(sleep_duration):
         # LifeSnaps stocke la durée en millisecondes
           sleep_hours = sleep_duration / (1000 * 60 * 60)
        else:
           sleep_hours = np.nan

        # ======================================================
        # Mood
        # ======================================================

        mood = np.nan

        mood_columns = [
            "HAPPY",
            "ALERT",
            "RESTED/RELAXED",
            "NEUTRAL",
            "TIRED",
            "SAD",
            "TENSE/ANXIOUS",
        ]

        available = [
            c for c in mood_columns
            if c in daily.columns
        ]

        if available:

            positive = (
                row.get("HAPPY", 0)
                + row.get("ALERT", 0)
                + row.get("RESTED/RELAXED", 0)
            )

            negative = (
                row.get("TIRED", 0)
                + row.get("SAD", 0)
                + row.get("TENSE/ANXIOUS", 0)
            )

            mood = positive - negative




       # ======================================================
       # Age
       # ======================================================

        age = row.get("age", np.nan)

        if pd.notna(age):
           age = str(age).strip()

           age_mapping = {
             "<30": 25,
             ">=30": 35,
             "30-39": 35,
             "40-49": 45,
             "50+": 55,
           }

           age = age_mapping.get(age, np.nan)
        # ======================================================
        # Construction NUBD
        # ======================================================

        record = {

            # Identification
            "subject_id": subject_id,
            "day_index": np.nan,
            "date": row.get("date", None),

            "dataset_source": "lifesnaps",
            "device_type": "Fitbit",
            "timezone": np.nan,

            # Physiologie
            "resting_hr": row.get("resting_hr", np.nan),
            "hrv_rmssd": row.get("rmssd", np.nan),
            "spo2": row.get("spo2", np.nan),
            "resp_rate": row.get(
                "full_sleep_breathing_rate",
                np.nan,
            ),

            # Sommeil
            "sleep_hours": sleep_hours,
            "sleep_efficiency": row.get(
                "sleep_efficiency",
                np.nan,
            ),

            # Activité
            "steps": row.get("steps", np.nan),
            "exercise_minutes": exercise_minutes,

            # Bien-être
            "stress": row.get("stress_score", np.nan),
            "mood": mood,
            "fatigue": np.nan,

            # Démographie
            "age": age,
            "sex": row.get("gender", np.nan),
            "height": np.nan,
            "weight": np.nan,
        }

        records.append(record)

    return records


# ==========================================================
# Test
# ==========================================================

if __name__ == "__main__":

    from ai_engine.parsers.parse_lifesnaps import parse_lifesnaps

    dataset = parse_lifesnaps()

    first_user = list(dataset.keys())[0]

    records = build_daily_record(
        first_user,
        dataset[first_user],
    )

    print("=" * 60)
    print("Utilisateur :", first_user)
    print("=" * 60)

    print(f"Nombre de jours : {len(records)}")

    print()

    print(pd.DataFrame(records).head())