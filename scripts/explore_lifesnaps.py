"""
explore_lifesnaps.py

Explore automatiquement les fichiers CSV du dataset LifeSnaps.
"""

from pathlib import Path
import pandas as pd

# ==========================================================
# Chemin vers les CSV
# ==========================================================

DATA_DIR = Path(
    "data/raw/lifesnaps/extracted/LifeSnaps/"
    "rais_anonymized/csv_rais_anonymized"
)

# ==========================================================
# Recherche des fichiers
# ==========================================================

csv_files = sorted(DATA_DIR.glob("*.csv"))

print("\n" + "=" * 80)
print("LIFESNAPS DATASET EXPLORATION")
print("=" * 80)

print(f"\nNombre de fichiers CSV : {len(csv_files)}")

# ==========================================================
# Exploration
# ==========================================================

for file in csv_files:

    print("\n" + "=" * 100)
    print(file.name)
    print("=" * 100)

    try:
        df = pd.read_csv(file)

        # ---------------------------
        # Dimensions
        # ---------------------------

        print(f"\nDimensions : {df.shape}")

        # ---------------------------
        # Colonnes
        # ---------------------------

        print("\nColonnes :")

        for col in df.columns:
            print(f" - {col}")

        # ---------------------------
        # Types
        # ---------------------------

        print("\nTypes :")

        print(df.dtypes)

        # ---------------------------
        # Valeurs manquantes
        # ---------------------------

        print("\nValeurs manquantes :")

        print(df.isna().sum())

        # ---------------------------
        # Nombre de valeurs uniques
        # ---------------------------

        print("\nValeurs uniques :")

        for col in df.columns:

            print(f"{col:35} {df[col].nunique()}")

        # ---------------------------
        # Aperçu
        # ---------------------------

        print("\nPremières lignes :")

        print(df.head())

    except Exception as e:

        print(f"\nErreur : {e}")

print("\n" + "=" * 80)
print("Exploration terminée.")
print("=" * 80)