"""
parse_mmash.py

Parser du dataset MMASH.

Responsabilités :
- Parcourir automatiquement tous les utilisateurs
- Lire les fichiers CSV
- Nettoyer les colonnes inutiles
- Retourner les données sous forme de DataFrames

"""

from pathlib import Path
import pandas as pd

# Configuration

MMASH_PATH = Path("data/raw/mmash/extracted/MMASH/DataPaper")

CSV_FILES = {
    "actigraph": "Actigraph.csv",
    "activity": "Activity.csv",
    "rr": "RR.csv",
    "sleep": "sleep.csv",
    "questionnaire": "questionnaire.csv",
    "saliva": "saliva.csv",
    "user_info": "user_info.csv",
}


# Fonctions utilitaires

def load_csv(csv_path: Path) -> pd.DataFrame:
    """
    Charge un CSV et supprime les colonnes inutiles.
    """

    df = pd.read_csv(csv_path)

    # Supprimer les colonnes automatiques pandas
    unnamed = [c for c in df.columns if c.startswith("Unnamed")]

    if unnamed:
        df = df.drop(columns=unnamed)

    return df


# Parser principal

def parse_mmash() -> dict:
    """
    Retourne toutes les données MMASH.

    Returns
    -------
    dict

    {
        "user_1": {
            "actigraph": DataFrame,
            "activity": DataFrame,
            ...
        },

        "user_2": {...}
    }
    """

    dataset = {}

    users = sorted(MMASH_PATH.glob("user_*"))

    print(f"{len(users)} utilisateurs détectés.\n")

    for user_folder in users:

        subject_id = user_folder.name

        print(f"Lecture de {subject_id}")

        subject_data = {}

        for key, filename in CSV_FILES.items():

            csv_path = user_folder / filename

            if csv_path.exists():

                subject_data[key] = load_csv(csv_path)

            else:

                print(f"Fichier absent : {csv_path}")

                subject_data[key] = pd.DataFrame()

def parse_mmash() -> dict:

    dataset = {}

    # Compteur des fichiers manquants
    missing_files = 0

    users = sorted(MMASH_PATH.glob("user_*"))

    print(f"{len(users)} utilisateurs détectés.\n")

    for user_folder in users:

        subject_id = user_folder.name

        print(f"Lecture de {subject_id}")

        subject_data = {}

        for key, filename in CSV_FILES.items():

            csv_path = user_folder / filename

            if csv_path.exists():

                subject_data[key] = load_csv(csv_path)

            else:

                missing_files += 1
                print(f"Fichier absent : {csv_path}")

                subject_data[key] = pd.DataFrame()

        dataset[subject_id] = subject_data

    print("\n===============================")
    print("Résumé")
    print("===============================")
    print(f"Utilisateurs lus : {len(users)}")
    print(f"Fichiers manquants : {missing_files}")

    return dataset


# ==========================================================
# Test rapide
# ==========================================================

if __name__ == "__main__":

    mmash = parse_mmash()

    print("\n===============================")
    print("Utilisateur :", list(mmash.keys())[0])
    print("===============================")

    first_user = list(mmash.keys())[0]

    for name, df in mmash[first_user].items():

        print("\n", name.upper())

        print(df.head())