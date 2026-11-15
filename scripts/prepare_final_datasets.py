"""
Prepare final datasets for Novapulse pipeline.

Input:
    data/processed/nubd_daily.parquet
    data/processed/nasa_features_v2.parquet

Output:
    data/processed/nubd_clean.parquet
    data/processed/nasa_clean.parquet
    data/processed/dataset_metadata.json
"""

from pathlib import Path
import pandas as pd
import json


# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data" / "processed"

NUBD_PATH = DATA_DIR / "nubd_daily.parquet"
NASA_PATH = DATA_DIR / "nasa_features_v2.parquet"


OUTPUT_NUBD = DATA_DIR / "nubd_clean.parquet"
OUTPUT_NASA = DATA_DIR / "nasa_clean.parquet"
OUTPUT_META = DATA_DIR / "dataset_metadata.json"


# ============================================================
# Cleaning functions
# ============================================================

def clean_columns(df):
    """
    Standardize column names
    """
    df.columns = (
        df.columns
        .str.lower()
        .str.strip()
        .str.replace(" ", "_")
    )

    return df


def basic_clean(df):
    """
    Basic dataframe cleaning
    """

    df = clean_columns(df)

    # remove duplicate rows
    df = df.drop_duplicates()

    # remove completely empty columns
    df = df.dropna(axis=1, how="all")

    return df


# ============================================================
# NUBD processing
# ============================================================

def prepare_nubd():

    print("\n" + "="*60)
    print("Preparation NUBD")
    print("="*60)

    df = pd.read_parquet(NUBD_PATH)

    print("Original shape :", df.shape)

    df = basic_clean(df)

    # Add source
    df["source"] = "NUBD"

    # Date conversion
    if "date" in df.columns:
        df["date"] = pd.to_datetime(
            df["date"],
            errors="coerce"
        )

    # Subject id as string
    if "subject_id" in df.columns:
        df["subject_id"] = (
            df["subject_id"]
            .astype(str)
        )


    print("Clean shape :", df.shape)

    print("\nMissing values:")
    print(df.isna().sum())


    df.to_parquet(
        OUTPUT_NUBD,
        index=False
    )

    print("\nSaved :", OUTPUT_NUBD)

    return df



# ============================================================
# NASA processing
# ============================================================

def prepare_nasa():

    print("\n" + "="*60)
    print("Preparation NASA")
    print("="*60)


    df = pd.read_parquet(NASA_PATH)

    print("Original shape :", df.shape)


    df = basic_clean(df)


    # Add source
    df["source"] = "NASA_OSDR"


    # Subject id string
    if "subject_id" in df.columns:
        df["subject_id"] = (
            df["subject_id"]
            .astype(str)
        )


    # Condition uppercase
    if "condition" in df.columns:
        df["condition"] = (
            df["condition"]
            .astype(str)
            .str.upper()
        )


    print("Clean shape :", df.shape)

    print("\nMissing values:")
    print(df.isna().sum())


    df.to_parquet(
        OUTPUT_NASA,
        index=False
    )


    print("\nSaved :", OUTPUT_NASA)


    return df



# ============================================================
# Metadata
# ============================================================

def save_metadata(nubd, nasa):

    metadata = {

        "datasets": {

            "NUBD": {
                "source": "LifeSnaps + MMASH",
                "rows": len(nubd),
                "columns": list(nubd.columns)
            },


            "NASA_OSDR": {
                "source": "NASA Open Science Data Repository",
                "rows": len(nasa),
                "columns": list(nasa.columns)
            }

        },


        "pipeline_stage":
            "cleaning_completed",

        "next_step":
            "feature_engineering_and_fusion"

    }


    with open(
        OUTPUT_META,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            metadata,
            f,
            indent=4,
            default=str
        )


    print("\nMetadata saved :", OUTPUT_META)



# ============================================================
# Main
# ============================================================

def main():

    print("\n")
    print("="*70)
    print("NOVAPULSE - FINAL DATASET PREPARATION")
    print("="*70)


    nubd = prepare_nubd()

    nasa = prepare_nasa()


    save_metadata(
        nubd,
        nasa
    )


    print("\n")
    print("="*70)
    print("PREPARATION COMPLETE")
    print("="*70)



if __name__ == "__main__":
    main()