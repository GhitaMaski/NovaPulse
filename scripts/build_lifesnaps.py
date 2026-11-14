"""
build_lifesnaps.py

Construit le dataset journalier LifeSnaps
au format NUBD.
"""

from pathlib import Path

import pandas as pd

from ai_engine.parsers.parse_lifesnaps import parse_lifesnaps
from ai_engine.preprocessing.build_daily_record_lifesnaps import (
    build_daily_record,
)
from ai_engine.preprocessing.quality_checks import check_dataframe


# ==========================================================
# Dossier de sortie
# ==========================================================

OUTPUT_DIR = Path("data/processed")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "lifesnaps_daily.parquet"


# ==========================================================
# Construction
# ==========================================================

def main():

    print("\n" + "=" * 60)
    print("Chargement du dataset LifeSnaps...")
    print("=" * 60)

    dataset = parse_lifesnaps()

    records = []

    # ------------------------------------------------------
    # Construction des enregistrements
    # ------------------------------------------------------

    for subject_id, subject_data in dataset.items():

        daily_records = build_daily_record(
            subject_id,
            subject_data,
        )

        records.extend(daily_records)

    # ------------------------------------------------------
    # DataFrame final
    # ------------------------------------------------------

    df = pd.DataFrame(records)

    print("\nStatistiques de sleep_hours")
    print(df["sleep_hours"].describe())

    print("\nValeurs les plus petites")
    print(df["sleep_hours"].sort_values().head(20))

    print("\nValeurs les plus grandes")
    print(df["sleep_hours"].sort_values().tail(20))

    print("\n")
    print("=" * 60)
    print("Dataset construit")
    print("=" * 60)

    print(f"Nombre de lignes     : {len(df)}")
    print(f"Nombre de colonnes   : {len(df.columns)}")

    print("\nColonnes :")

    print(df.columns.tolist())

    print("\nAperçu :")

    print(df.head())

    # ------------------------------------------------------
    # Contrôle qualité
    # ------------------------------------------------------

    check_dataframe(df)

    # ------------------------------------------------------
    # Sauvegarde
    # ------------------------------------------------------
    print("\nValeurs uniques de age :")
    print(df["age"].dropna().unique())  
    df.to_parquet(
        OUTPUT_FILE,
        index=False,
    )

    print("\n")
    print("=" * 60)
    print("Sauvegarde terminée")
    print("=" * 60)

    print(f"Fichier enregistré : {OUTPUT_FILE.resolve()}")


# ==========================================================
# Main
# ==========================================================

if __name__ == "__main__":
    main()