import pandas as pd
from pathlib import Path

file = Path(
    "data/raw/lifesnaps/extracted/LifeSnaps/"
    "rais_anonymized/csv_rais_anonymized/"
    "daily_fitbit_sema_df_unprocessed.csv"
)

df = pd.read_csv(file, low_memory=False)

print(df["sleep_duration"].describe())

print("\nPlus petites valeurs :")
print(df["sleep_duration"].sort_values().head(20))

print("\nPlus grandes valeurs :")
print(df["sleep_duration"].sort_values().tail(20))