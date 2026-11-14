"""
build_nubd.py

Fusionne les datasets MMASH et LifeSnaps
pour créer le dataset unifié NUBD.
"""

from pathlib import Path

import pandas as pd

from ai_engine.preprocessing.quality_checks import check_dataframe


# ==========================================================
# Chemins
# ==========================================================

PROCESSED_DIR = Path("data/processed")

MMASH_FILE = PROCESSED_DIR / "mmash_daily.parquet"
LIFESNAPS_FILE = PROCESSED_DIR / "lifesnaps_daily.parquet"

OUTPUT_FILE = PROCESSED_DIR / "nubd_daily.parquet"


# ==========================================================
# Construction
# ==========================================================

def main():

    print("=" * 60)
    print("Chargement des datasets...")
    print("=" * 60)

    if not MMASH_FILE.exists():
        raise FileNotFoundError(
            f"Fichier introuvable : {MMASH_FILE}"
        )

    if not LIFESNAPS_FILE.exists():
        raise FileNotFoundError(
            f"Fichier introuvable : {LIFESNAPS_FILE}"
        )

    mmash = pd.read_parquet(MMASH_FILE)
    lifesnaps = pd.read_parquet(LIFESNAPS_FILE)

    # ======================================================
    # Vérification des colonnes
    # ======================================================

    if list(mmash.columns) != list(lifesnaps.columns):

        print("\nColonnes MMASH :")
        print(mmash.columns.tolist())

        print("\nColonnes LifeSnaps :")
        print(lifesnaps.columns.tolist())

        raise ValueError(
            "Les deux datasets n'ont pas les mêmes colonnes."
        )

    # ======================================================
    # Fusion
    # ======================================================

    print("\nFusion des datasets...")

    nubd = pd.concat(
        [mmash, lifesnaps],
        ignore_index=True,
    )

    # ======================================================
    # Résumé
    # ======================================================

    print("\n" + "=" * 60)
    print("Dataset NUBD")
    print("=" * 60)

    print(f"Lignes MMASH      : {len(mmash)}")
    print(f"Lignes LifeSnaps  : {len(lifesnaps)}")
    print(f"Lignes totales    : {len(nubd)}")

    print(f"\nColonnes : {len(nubd.columns)}")

    print("\nRépartition par dataset :")
    print(nubd["dataset_source"].value_counts())

    # ======================================================
    # Contrôle qualité
    # ======================================================

    check_dataframe(nubd)

    # ======================================================
    # Sauvegarde
    # ======================================================

    nubd.to_parquet(
        OUTPUT_FILE,
        index=False,
    )

    print("\n" + "=" * 60)
    print("Sauvegarde terminée")
    print("=" * 60)

    print(f"Fichier enregistré : {OUTPUT_FILE.resolve()}")


# ==========================================================
# Main
# ==========================================================

if __name__ == "__main__":
    main()