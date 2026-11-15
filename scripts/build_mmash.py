"""
build_mmash.py

Construit le dataset journalier MMASH
à partir des données brutes.
"""

from pathlib import Path

import pandas as pd

from ai_engine.parsers.parse_mmash import parse_mmash
from ai_engine.preprocessing.build_daily_record import build_daily_record
from ai_engine.preprocessing.quality_checks import check_dataframe  

# ==========================================================
# Dossier de sortie
# ==========================================================

OUTPUT_DIR = Path("data/processed")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "mmash_daily.parquet"


# ==========================================================
# Construction du dataset
# ==========================================================

def build_mmash_dataset() -> pd.DataFrame:

    print("=" * 60)
    print("Chargement du dataset MMASH...")
    print("=" * 60)

    dataset = parse_mmash()

    records = []

    for subject_id, subject_data in dataset.items():

        record = build_daily_record(subject_id, subject_data)

        records.append(record)

    df = pd.DataFrame(records)

    return df


# ==========================================================
# Main
# ==========================================================

if __name__ == "__main__":

    df = build_mmash_dataset()

    print("\n")
    print("=" * 60)
    print("Dataset construit")
    print("=" * 60)

    print(f"Nombre d'utilisateurs : {len(df)}")
    print(f"Nombre de colonnes    : {len(df.columns)}")

    print("\nColonnes :")
    print(df.columns.tolist())

    print("\nAperçu :")
    print(df.head())

    check_dataframe(df)
    # Sauvegarde
    df.to_parquet(OUTPUT_FILE, index=False)

    print("\n")
    print("=" * 60)
    print("Sauvegarde terminée")
    print("=" * 60)

    print(f"Fichier enregistré : {OUTPUT_FILE.resolve()}")