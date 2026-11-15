"""
build_daily_record.py

Construit un enregistrement journalier (NUBD)
à partir des données d'un utilisateur MMASH.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


# ==========================================================
# HRV
# ==========================================================

def compute_rmssd(rr_df: pd.DataFrame) -> float:
    """
    Calcule le RMSSD (Root Mean Square of Successive Differences)
    à partir des intervalles RR (ibi_s en secondes).

    Retour :
        RMSSD en millisecondes.
    """

    if rr_df.empty or "ibi_s" not in rr_df.columns:
        return np.nan

    ibi = rr_df["ibi_s"].dropna().to_numpy()

    if len(ibi) < 3:
        return np.nan

    diff = np.diff(ibi)

    rmssd = np.sqrt(np.mean(diff ** 2))

    return rmssd * 1000  # secondes -> millisecondes


# ==========================================================
# Exercise
# ==========================================================

def compute_exercise_minutes(activity_df: pd.DataFrame) -> float:
    """
    Calcule le temps total d'activité en minutes.
    """

    if activity_df.empty:
        return np.nan

    required = {"Start", "End"}

    if not required.issubset(activity_df.columns):
        return np.nan

    total_minutes = 0.0

    for _, row in activity_df.iterrows():

        try:

            start = pd.to_datetime(row["Start"], format="%H:%M")
            end = pd.to_datetime(row["End"], format="%H:%M")

            duration = (end - start).total_seconds() / 60

            if duration > 0:
                total_minutes += duration

        except Exception:
            continue

    return total_minutes


# ==========================================================
# Mood
# ==========================================================

def compute_mood(questionnaire_df: pd.DataFrame) -> float:
    """
    Mood = PANAS positif - PANAS négatif
    """

    if questionnaire_df.empty:
        return np.nan

    pos_cols = [
        c for c in questionnaire_df.columns
        if c.startswith("panas_pos")
    ]

    neg_cols = [
        c for c in questionnaire_df.columns
        if c.startswith("panas_neg")
    ]

    if not pos_cols or not neg_cols:
        return np.nan

    pos = questionnaire_df[pos_cols].mean(axis=1).iloc[0]
    neg = questionnaire_df[neg_cols].mean(axis=1).iloc[0]

    return pos - neg


# ==========================================================
# Build Daily Record
# ==========================================================

def build_daily_record(subject_id: str, subject_data: dict) -> dict:
    """
    Construit un enregistrement journalier NUBD
    pour un utilisateur MMASH.
    """

    actigraph = subject_data.get("actigraph", pd.DataFrame())
    activity = subject_data.get("activity", pd.DataFrame())
    rr = subject_data.get("rr", pd.DataFrame())
    sleep = subject_data.get("sleep", pd.DataFrame())
    questionnaire = subject_data.get("questionnaire", pd.DataFrame())
    user_info = subject_data.get("user_info", pd.DataFrame())

    record = {

        # ======================================================
        # Identification
        # ======================================================

        "subject_id": subject_id,
        "day_index": np.nan,
        "date": None,

        "dataset_source": "mmash",

        "device_type": None,
        "timezone": None,

        # ======================================================
        # Physiological Signals
        # ======================================================

        "resting_hr": np.nan,
        "hrv_rmssd": np.nan,
        "spo2": np.nan,
        "resp_rate": np.nan,

        # ======================================================
        # Sleep
        # ======================================================

        "sleep_hours": np.nan,
        "sleep_efficiency": np.nan,

        # ======================================================
        # Activity
        # ======================================================

        "steps": np.nan,
        "exercise_minutes": np.nan,

        # ======================================================
        # Wellness
        # ======================================================

        "stress": np.nan,
        "mood": np.nan,
        "fatigue": np.nan,

        # ======================================================
        # Demographics
        # ======================================================

        "age": np.nan,
        "sex": np.nan,
        "height": np.nan,
        "weight": np.nan,
    }

    # ==========================================================
    # Actigraph
    # ==========================================================

    if not actigraph.empty:

        if "day" in actigraph.columns:
            record["day_index"] = int(actigraph["day"].iloc[0])

        if "HR" in actigraph.columns:
            record["resting_hr"] = actigraph["HR"].mean()

        if "Steps" in actigraph.columns:
            record["steps"] = actigraph["Steps"].sum()

    # ==========================================================
    # HRV
    # ==========================================================

    record["hrv_rmssd"] = compute_rmssd(rr)

    # ==========================================================
    # Activity
    # ==========================================================

    record["exercise_minutes"] = compute_exercise_minutes(activity)

    # ==========================================================
    # Sleep
    # ==========================================================

    if not sleep.empty:

        if "Total Sleep Time (TST)" in sleep.columns:

            record["sleep_hours"] = (
                sleep["Total Sleep Time (TST)"].mean() / 60
            )

        if "Efficiency" in sleep.columns:

            record["sleep_efficiency"] = (
                sleep["Efficiency"].mean()
            )

    # ==========================================================
    # Questionnaire
    # ==========================================================

    if not questionnaire.empty:

        if "Daily_stress" in questionnaire.columns:

            record["stress"] = (
                questionnaire["Daily_stress"].iloc[0]
            )

        record["mood"] = compute_mood(questionnaire)

    # ==========================================================
    # User Information
    # ==========================================================

    if not user_info.empty:

        if "Age" in user_info.columns:
            record["age"] = user_info["Age"].iloc[0]

        if "Gender" in user_info.columns:
            record["sex"] = user_info["Gender"].iloc[0]

        if "Height" in user_info.columns:
            record["height"] = user_info["Height"].iloc[0]

        if "Weight" in user_info.columns:
            record["weight"] = user_info["Weight"].iloc[0]

    return record


# ==========================================================
# Test local
# ==========================================================

if __name__ == "__main__":

    print("Module build_daily_record chargé avec succès.")