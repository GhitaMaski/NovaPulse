"""
inspect_nasa_csv.py

Inspection automatique du dataset NASA
Flight Crew Physiological Data.

Objectif :
- découvrir la structure des CSV
- identifier les variables disponibles
- vérifier si les fichiers ont la même structure
"""

from pathlib import Path
import pandas as pd


# ==========================================================
# Chemin dataset NASA
# ==========================================================

NASA_DIR = Path(
    "data/raw/nasa/extracted"
)


# ==========================================================
# Inspection d'un fichier
# ==========================================================

def inspect_file(file_path: Path):

    print("\n" + "=" * 80)
    print(file_path.name)
    print("=" * 80)

    try:

        # Lire seulement quelques lignes
        df = pd.read_csv(
            file_path,
            nrows=5
        )

        print("\nColonnes :")
        for col in df.columns:
            print(f" - {col}")


        print("\nTypes :")
        print(df.dtypes)


        print("\nAperçu :")
        print(df.head())


        # Taille réelle du fichier
        size_mb = file_path.stat().st_size / (1024 * 1024)

        print(
            f"\nTaille fichier : {size_mb:.2f} MB"
        )


        return list(df.columns)


    except Exception as e:

        print(
            f"Erreur lecture {file_path.name} : {e}"
        )

        return []


# ==========================================================
# Main
# ==========================================================

def main():

    print("=" * 80)
    print("Inspection dataset NASA")
    print("=" * 80)


    csv_files = sorted(
        NASA_DIR.rglob("*.csv")
    )


    print(
        f"\nNombre de fichiers CSV trouvés : {len(csv_files)}"
    )


    structures = {}


    for file in csv_files:

        columns = inspect_file(file)

        key = tuple(columns)

        if key not in structures:
            structures[key] = []

        structures[key].append(
            file.name
        )


    # ======================================================
    # Résumé structures
    # ======================================================

    print("\n\n")
    print("=" * 80)
    print("Résumé des structures")
    print("=" * 80)


    print(
        f"\nNombre de structures différentes : {len(structures)}"
    )


    for i, (cols, files) in enumerate(structures.items(), 1):

        print("\n" + "-" * 80)

        print(
            f"Structure {i}"
        )

        print(
            f"Nombre de fichiers : {len(files)}"
        )

        print(
            "Exemples :"
        )

        for f in files[:5]:
            print(
                f"  - {f}"
            )


        print(
            "\nColonnes :"
        )

        for c in cols:
            print(
                f"  {c}"
            )


# ==========================================================

if __name__ == "__main__":
    main()