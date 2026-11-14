from pathlib import Path
import pandas as pd

BASE_PATH = Path("data/raw/mmash/extracted/MMASH/DataPaper")

CSV_FILES = [
    "Actigraph.csv",
    "Activity.csv",
    "RR.csv",
    "sleep.csv",
    "questionnaire.csv",
    "saliva.csv",
    "user_info.csv",
]

for user in sorted(BASE_PATH.glob("user_*")):

    print(f"\n{'='*70}")
    print(user.name)
    print("="*70)

    for file in CSV_FILES:

        path = user / file

        if path.exists():
            df = pd.read_csv(path, nrows=5)

            print(f"\n{file}")
            print(list(df.columns))