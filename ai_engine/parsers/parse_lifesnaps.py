"""
parse_lifesnaps.py

Charge le dataset LifeSnaps et regroupe les données
par utilisateur.

Structure retournée :

{
    "P001": {
        "daily": DataFrame,
        "hourly": DataFrame
    },
    ...
}
"""

from __future__ import annotations

from pathlib import Path
import pandas as pd

# ==========================================================
# Chemins
# ==========================================================

DATA_DIR = Path(
    "data/raw/lifesnaps/extracted/LifeSnaps/"
    "rais_anonymized/csv_rais_anonymized"
)

DAILY_FILE = DATA_DIR / "daily_fitbit_sema_df_unprocessed.csv"
HOURLY_FILE = DATA_DIR / "hourly_fitbit_sema_df_unprocessed.csv"


# ==========================================================
# Lecture CSV
# ==========================================================

def load_csv(path: Path) -> pd.DataFrame:
    """
    Charge un fichier CSV en supprimant les colonnes inutiles
    et en convertissant la colonne 'date' si elle existe.
    """

    df = pd.read_csv(
        path,
        low_memory=False
    )

    # Supprimer les colonnes "Unnamed"
    df = df.loc[:, ~df.columns.str.contains("^Unnamed")]

    # Conversion de la date
    if "date" in df.columns:
        df["date"] = pd.to_datetime(
            df["date"],
            errors="coerce"
        )

    return df


# ==========================================================
# Parser principal
# ==========================================================

def parse_lifesnaps() -> dict:
    """
    Retourne les données LifeSnaps organisées
    par utilisateur.

    Returns
    -------
    dict
        {
            user_id: {
                "daily": DataFrame,
                "hourly": DataFrame
            }
        }
    """

    if not DAILY_FILE.exists():
        raise FileNotFoundError(
            f"Fichier introuvable : {DAILY_FILE}"
        )

    if not HOURLY_FILE.exists():
        raise FileNotFoundError(
            f"Fichier introuvable : {HOURLY_FILE}"
        )

    print("=" * 60)
    print("Chargement des fichiers LifeSnaps...")
    print("=" * 60)

    daily = load_csv(DAILY_FILE)
    hourly = load_csv(HOURLY_FILE)

    # Vérification des colonnes
    if "id" not in daily.columns:
        raise ValueError(
            "Colonne 'id' absente du fichier journalier."
        )

    if "id" not in hourly.columns:
        raise ValueError(
            "Colonne 'id' absente du fichier horaire."
        )

    users = sorted(daily["id"].unique())

    print(f"\n{len(users)} utilisateurs détectés.\n")

    dataset = {}

    for user in users:

        print(f"Lecture de {user}")

        dataset[user] = {
            "daily": (
                daily[daily["id"] == user]
                .reset_index(drop=True)
            ),
            "hourly": (
                hourly[hourly["id"] == user]
                .reset_index(drop=True)
            ),
        }

    # ======================================================
    # Résumé
    # ======================================================

    print("\n" + "=" * 60)
    print("Résumé")
    print("=" * 60)

    print(f"Utilisateurs lus : {len(dataset)}")

    return dataset


# ==========================================================
# Test
# ==========================================================

if __name__ == "__main__":

    lifesnaps = parse_lifesnaps()

    first_user = list(lifesnaps.keys())[0]

    print("\n" + "=" * 60)
    print(f"Utilisateur : {first_user}")
    print("=" * 60)

    print("\nDAILY")
    print(lifesnaps[first_user]["daily"].head())

    print("\nHOURLY")
    print(lifesnaps[first_user]["hourly"].head())