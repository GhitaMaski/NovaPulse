"""
NovaPulse - Missing Features Simulation

Adds simulated astronaut health and space environment features
to the existing ML dataset.
"""

import os
import numpy as np
import pandas as pd


RANDOM_SEED = 42


INPUT_PATH = "data/processed/ml_dataset.parquet"
OUTPUT_PATH = "data/processed/novapulse_ai_dataset.parquet"


def clip(value, low, high):
    return np.clip(value, low, high)


def simulate_features(df):

    np.random.seed(RANDOM_SEED)

    n = len(df)

    print("\nSimulating missing astronaut features...")

    # ============================================
    # Mission parameters
    # ============================================

    mission_day = np.random.randint(
        1,
        365,
        size=n
    )

    microgravity_days = mission_day.copy()


    # ============================================
    # Heart Rate
    # ============================================

    stress_effect = df["stress_index"] * 20
    activity_effect = df["activity_score"] * 25

    heart_rate = (
        60
        + stress_effect
        + activity_effect
        + np.random.normal(0, 3, n)
    )

    heart_rate = clip(
        heart_rate,
        45,
        150
    )


    # ============================================
    # SpO2
    # ============================================

    cabin_co2 = np.random.normal(
        0.05,
        0.015,
        n
    )

    spo2 = (
        98
        - cabin_co2 * 20
        - df["stress_index"] * 3
        + np.random.normal(0, 0.5, n)
    )

    spo2 = clip(
        spo2,
        88,
        100
    )


    # ============================================
    # Body temperature
    # ============================================

    body_temperature = (
        36.7
        + df["stress_index"] * 0.3
        + np.random.normal(0, 0.15, n)
    )

    body_temperature = clip(
        body_temperature,
        35.8,
        38.5
    )


    # ============================================
    # Blood pressure
    # ============================================

    systolic_bp = (
        110
        + df["stress_index"] * 25
        + df["activity_score"] * 10
        + np.random.normal(0, 5, n)
    )

    diastolic_bp = (
        70
        + df["stress_index"] * 12
        + np.random.normal(0, 3, n)
    )


    systolic_bp = clip(
        systolic_bp,
        80,
        180
    )

    diastolic_bp = clip(
        diastolic_bp,
        50,
        120
    )


    # ============================================
    # Sleep
    # ============================================

    sleep_hours = (
        8
        - df["stress_index"] * 2
        - df["cognitive_load"] * 1.5
        + np.random.normal(0, 0.5, n)
    )

    sleep_hours = clip(
        sleep_hours,
        3,
        10
    )


    sleep_quality = (
        100
        - df["stress_index"] * 40
        - df["cognitive_load"] * 30
        + np.random.normal(0, 5, n)
    )

    sleep_quality = clip(
        sleep_quality,
        0,
        100
    )


    sleep_efficiency = clip(
        sleep_quality + np.random.normal(0,5,n),
        0,
        100
    )


    sleep_debt = clip(
        8 - sleep_hours,
        0,
        10
    )


    # ============================================
    # Space environment
    # ============================================

    radiation_dose = (
        mission_day * 0.8
        + np.random.normal(0,5,n)
    )

    radiation_dose = clip(
        radiation_dose,
        0,
        None
    )


    radiation_risk = clip(
        radiation_dose / 300,
        0,
        1
    )


    muscle_loss_index = clip(
        mission_day / 500
        + np.random.normal(0,0.02,n),
        0,
        1
    )


    bone_density_risk = clip(
        mission_day / 700
        + np.random.normal(0,0.02,n),
        0,
        1
    )


    # ============================================
    # AI OUTPUTS
    # ============================================

    health_score = (
        100
        - df["stress_index"] * 25
        - sleep_debt * 5
        - radiation_risk * 20
        - muscle_loss_index * 20
        + np.random.normal(0,3,n)
    )

    health_score = clip(
        health_score,
        0,
        100
    )


    fatigue_risk = clip(
        (
            df["stress_index"] * 0.4
            + sleep_debt/10 * 0.3
            + df["cognitive_load"] * 0.3
        ),
        0,
        1
    )


    cardio_risk = clip(
        (
            (heart_rate-60)/100 * 0.4
            + df["stress_index"]*0.4
            + (systolic_bp-100)/100*0.2
        ),
        0,
        1
    )


    sleep_risk = clip(
        1 - sleep_quality/100,
        0,
        1
    )


    mission_status = np.where(
        health_score < 40,
        "CRITICAL",
        np.where(
            health_score < 70,
            "WARNING",
            "NORMAL"
        )
    )


    simulated = pd.DataFrame({

        "mission_day": mission_day,

        "heart_rate": heart_rate,
        "spo2": spo2,
        "body_temperature": body_temperature,

        "systolic_bp": systolic_bp,
        "diastolic_bp": diastolic_bp,

        "sleep_hours": sleep_hours,
        "sleep_quality": sleep_quality,
        "sleep_efficiency": sleep_efficiency,
        "sleep_debt": sleep_debt,

        "cabin_co2": cabin_co2,

        "microgravity_days": microgravity_days,
        "muscle_loss_index": muscle_loss_index,
        "bone_density_risk": bone_density_risk,

        "radiation_dose": radiation_dose,
        "radiation_risk": radiation_risk,

        "health_score": health_score,

        "fatigue_risk": fatigue_risk,
        "cardio_risk": cardio_risk,
        "sleep_risk": sleep_risk,

        "mission_status": mission_status
    })


    return simulated



def main():

    print("="*70)
    print("NOVAPULSE SIMULATION OF MISSING FEATURES")
    print("="*70)


    df = pd.read_parquet(INPUT_PATH)

    print("\nOriginal dataset:")
    print(df.shape)


    simulated = simulate_features(df)


    final_df = pd.concat(
        [
            df.reset_index(drop=True),
            simulated
        ],
        axis=1
    )


    print("\nFinal dataset:")
    print(final_df.shape)


    print("\nColumns:")
    print(final_df.columns.tolist())


    os.makedirs(
        os.path.dirname(OUTPUT_PATH),
        exist_ok=True
    )


    final_df.to_parquet(
        OUTPUT_PATH,
        index=False
    )


    print("\nSaved:")
    print(OUTPUT_PATH)



if __name__ == "__main__":
    main()