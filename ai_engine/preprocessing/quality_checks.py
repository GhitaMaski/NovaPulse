"""
quality_checks.py

Contrôles qualité pour les datasets NovaPulse.
"""

from __future__ import annotations

import pandas as pd


def check_dataframe(df: pd.DataFrame) -> bool:
    """
    Effectue plusieurs contrôles qualité sur un DataFrame.

    Returns
    -------
    bool
        True si tous les contrôles passent.
    """

    print("\n" + "=" * 60)
    print("QUALITY CHECKS")
    print("=" * 60)

    success = True

    # ======================================================
    # Dimensions
    # ======================================================

    print(f"\nNombre de lignes    : {len(df)}")
    print(f"Nombre de colonnes  : {len(df.columns)}")

    # ======================================================
    # Valeurs manquantes
    # ======================================================

    print("\nValeurs manquantes :")

    missing = df.isna().sum()

    print(missing)

    # ======================================================
    # Doublons
    # ======================================================

    duplicates = df.duplicated(
      subset=["subject_id", "date"]
).sum()

    print(f"\nDoublons subject_id : {duplicates}")

    if duplicates > 0:
        success = False
        print("❌ Doublons détectés.")

    # ======================================================
    # Resting HR
    # ======================================================

    if "resting_hr" in df.columns:

        invalid = df[
            (df["resting_hr"] < 30) |
            (df["resting_hr"] > 220)
        ]

        print(f"\nResting HR invalides : {len(invalid)}")

        if len(invalid) > 0:
            success = False

    # ======================================================
    # Sleep
    # ======================================================

    if "sleep_hours" in df.columns:

        invalid = df[
          df["sleep_hours"].notna() &
          (
            (df["sleep_hours"] < 0) |
            (df["sleep_hours"] > 24)
          )
]

        print(f"Sleep hours invalides : {len(invalid)}")

        if len(invalid) > 0:
         success = False

    # ======================================================
    # Steps
    # ======================================================

    if "steps" in df.columns:

        invalid = df[df["steps"] < 0]

        print(f"Steps invalides : {len(invalid)}")

        if len(invalid) > 0:
            success = False

    # ======================================================
    # HRV
    # ======================================================

    if "hrv_rmssd" in df.columns:

        invalid = df[df["hrv_rmssd"] < 0]

        print(f"RMSSD invalides : {len(invalid)}")

        if len(invalid) > 0:
            success = False

    # ======================================================
    # Résumé
    # ======================================================

    print("\n" + "=" * 60)

    if success:
        print("✅ Tous les contrôles sont passés.")
    else:
        print("⚠️ Certains contrôles ont échoué.")

    print("=" * 60)

    return success


if __name__ == "__main__":

    df = pd.read_parquet("data/processed/mmash_daily.parquet")

    check_dataframe(df)