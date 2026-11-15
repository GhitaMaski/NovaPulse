"""
Novapulse - Unified Feature Engineering v2

Input:
    data/processed/nubd_clean.parquet
    data/processed/nasa_clean.parquet

Output:
    data/processed/unified_features_v2.parquet
"""

from pathlib import Path
import pandas as pd
import numpy as np


# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data" / "processed"

NUBD_PATH = DATA_DIR / "nubd_clean.parquet"
NASA_PATH = DATA_DIR / "nasa_clean.parquet"

OUTPUT_PATH = DATA_DIR / "unified_features_v2.parquet"



# ============================================================
# Helper
# ============================================================

def minmax(series):

    minimum = series.min()
    maximum = series.max()

    if maximum == minimum:
        return pd.Series(
            0.5,
            index=series.index
        )

    return (
        (series - minimum)
        /
        (maximum - minimum)
    )



# ============================================================
# NUBD
# ============================================================

def build_nubd_features(df):

    print("\nFeature engineering NUBD")

    result = pd.DataFrame()

    result["subject_id"] = df["subject_id"]
    result["source"] = "NUBD"


    # -----------------------------
    # Recovery
    # -----------------------------

    sleep_score = minmax(
        df["sleep_hours"]
        .fillna(df["sleep_hours"].median())
    )

    efficiency_score = minmax(
        df["sleep_efficiency"]
        .fillna(df["sleep_efficiency"].median())
    )

    hrv_score = minmax(
        df["hrv_rmssd"]
        .fillna(df["hrv_rmssd"].median())
    )


    result["recovery_score"] = (
        0.4 * sleep_score
        +
        0.3 * efficiency_score
        +
        0.3 * hrv_score
    )


    # tendance récupération

    result["recovery_trend"] = minmax(
        result["recovery_score"]
        .diff()
        .abs()
        .fillna(0)
    )



    # -----------------------------
    # Cardiac
    # -----------------------------

    hr = minmax(
        df["resting_hr"]
        .fillna(df["resting_hr"].median())
    )

    hrv = minmax(
        df["hrv_rmssd"]
        .fillna(df["hrv_rmssd"].median())
    )


    result["cardiac_state"] = (
        0.5 * (1 - hr)
        +
        0.5 * hrv
    )


    result["hr_variability"] = minmax(
        df["hrv_rmssd"]
        .fillna(df["hrv_rmssd"].median())
    )



    # -----------------------------
    # Activity
    # -----------------------------

    steps = minmax(
        df["steps"]
        .fillna(df["steps"].median())
    )


    exercise = minmax(
        df["exercise_minutes"]
        .fillna(df["exercise_minutes"].median())
    )


    result["activity_score"] = (
        0.6 * steps
        +
        0.4 * exercise
    )


    result["activity_change"] = minmax(
        df["steps"]
        .fillna(0)
        .diff()
        .abs()
        .fillna(0)
    )



    # -----------------------------
    # Stress
    # -----------------------------

    if "stress" in df.columns:

        stress = df["stress"].fillna(
            df["stress"].median()
        )

        result["stress_index"] = minmax(
            stress
        )


        result["stress_variability"] = minmax(
            stress
            .rolling(
                window=7,
                min_periods=1
            )
            .std()
            .fillna(0)
        )

    else:

        result["stress_index"] = np.nan
        result["stress_variability"] = np.nan



    # NASA-only feature

    result["cognitive_load"] = np.nan

    result["alpha_beta_ratio"] = np.nan
    result["theta_alpha_ratio"] = np.nan
    result["gsr_variability"] = np.nan
    result["resp_variability"] = np.nan


    return result



# ============================================================
# NASA
# ============================================================

def build_nasa_features(df):

    print("\nFeature engineering NASA")


    result = pd.DataFrame()

    result["subject_id"] = df["subject_id"]

    result["source"] = "NASA_OSDR"



    # -----------------------------
    # Cardiac
    # -----------------------------

    ecg_variability = minmax(
        df["ecg_std"]
    )


    ecg_level = minmax(
        df["ecg_mean"]
    )


    result["cardiac_state"] = (
        0.5 * ecg_variability
        +
        0.5 * (1 - ecg_level)
    )


    result["hr_variability"] = ecg_variability



    # -----------------------------
    # Stress
    # -----------------------------

    gsr = minmax(
        df["gsr_mean"]
    )

    gsr_var = minmax(
        df["gsr_variability"]
    )


    result["stress_index"] = (
        0.6 * gsr
        +
        0.4 * gsr_var
    )


    result["stress_variability"] = gsr_var
    result["gsr_variability"] = gsr_var



    # -----------------------------
    # EEG cognitive load
    # -----------------------------

    beta = minmax(
        df["beta_power"]
    )

    theta = minmax(
        df["theta_power"]
    )

    alpha = minmax(
        df["alpha_power"]
    )


    result["cognitive_load"] = (
        0.5 * beta
        +
        0.5 * theta
    )


    result["alpha_beta_ratio"] = minmax(
        df["alpha_beta_ratio"]
    )


    result["theta_alpha_ratio"] = minmax(
        df["theta_alpha_ratio"]
    )



    # -----------------------------
    # Respiration
    # -----------------------------

    result["resp_variability"] = minmax(
        df["resp_std"]
    )



    # Not available NASA

    result["recovery_score"] = np.nan
    result["recovery_trend"] = np.nan
    result["activity_score"] = np.nan
    result["activity_change"] = np.nan


    return result



# ============================================================
# Main
# ============================================================

def main():

    print("=" * 70)
    print("NOVAPULSE FEATURE ENGINEERING v2")
    print("=" * 70)


    nubd = pd.read_parquet(
        NUBD_PATH
    )

    nasa = pd.read_parquet(
        NASA_PATH
    )


    print("\nNUBD :", nubd.shape)
    print("NASA :", nasa.shape)


    nubd_features = build_nubd_features(
        nubd
    )


    nasa_features = build_nasa_features(
        nasa
    )


    unified = pd.concat(
        [
            nubd_features,
            nasa_features
        ],
        ignore_index=True
    )


    print("\nDataset final features")

    print(
        unified.head()
    )


    print("\nShape :", unified.shape)


    print("\nMissing values:")

    print(
        unified.isna().sum()
    )


    unified.to_parquet(
        OUTPUT_PATH,
        index=False
    )


    print("\nSaved:")
    print(
        OUTPUT_PATH
    )



if __name__ == "__main__":
    main()