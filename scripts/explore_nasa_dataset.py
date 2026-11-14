"""
Explore automatiquement le dataset NASA Flight Crew.

Le script parcourt tous les dossiers contenus dans
data/raw/nasa et affiche :

- les dossiers trouvés
- les fichiers présents
- leur taille
- les fichiers CSV
- les fichiers JSON
- les fichiers MAT
- les fichiers TXT
"""

from pathlib import Path

# ==========================================================
# Racine
# ==========================================================

ROOT = Path("data/raw/nasa")


# ==========================================================
# Fonction taille lisible
# ==========================================================

def readable_size(size):

    for unit in ["B", "KB", "MB", "GB"]:

        if size < 1024:
            return f"{size:.1f} {unit}"

        size /= 1024

    return f"{size:.1f} TB"


# ==========================================================
# Exploration
# ==========================================================

def main():

    if not ROOT.exists():
        print(f"Le dossier {ROOT} n'existe pas.")
        return

    print("=" * 70)
    print("Exploration du dataset NASA")
    print("=" * 70)

    folders = sorted([p for p in ROOT.iterdir() if p.is_dir()])

    print(f"\nNombre de dossiers : {len(folders)}")

    total_files = 0

    extension_count = {}

    for folder in folders:

        print("\n" + "=" * 70)
        print(folder.name)
        print("=" * 70)

        files = sorted(folder.rglob("*"))

        files = [f for f in files if f.is_file()]

        print(f"Nombre de fichiers : {len(files)}")

        total_files += len(files)

        for file in files:

            ext = file.suffix.lower()

            extension_count[ext] = extension_count.get(ext, 0) + 1

            size = readable_size(file.stat().st_size)

            print(
                f"{file.relative_to(ROOT)}"
                f" | {size}"
            )

    print("\n" + "=" * 70)
    print("Résumé")
    print("=" * 70)

    print(f"Nombre total de fichiers : {total_files}")

    print("\nExtensions trouvées :")

    for ext, count in sorted(extension_count.items()):

        ext = ext if ext else "(sans extension)"
        print(f"{ext:<10} {count}")


# ==========================================================
# Main
# ==========================================================

if __name__ == "__main__":
    main()