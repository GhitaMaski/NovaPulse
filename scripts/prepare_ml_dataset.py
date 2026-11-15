"""
Novapulse - ML Dataset Preparation

Input:
    data/processed/unified_features_v2.parquet

Output:
    data/processed/ml_dataset.parquet
"""


from pathlib import Path
import pandas as pd
import numpy as np



# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data" / "processed"

INPUT_PATH = DATA_DIR / "unified_features_v2.parquet"

OUTPUT_PATH = DATA_DIR / "ml_dataset.parquet"



# ============================================================
# Main
# ============================================================

def main():

    print("="*70)
    print("NOVAPULSE ML DATASET PREPARATION")
    print("="*70)


    # --------------------------------------------------------
    # Load dataset
    # --------------------------------------------------------

    df = pd.read_parquet(
        INPUT_PATH
    )


    print("\nOriginal dataset:")
    print(df.shape)



    # --------------------------------------------------------
    # Sensor availability features
    # --------------------------------------------------------

    print("\nAdding sensor availability features...")


    df["has_recovery_data"] = (
        df["recovery_score"]
        .notna()
        .astype(int)
    )


    df["has_activity_data"] = (
        df["activity_score"]
        .notna()
        .astype(int)
    )


    df["has_eeg_data"] = (
        df["cognitive_load"]
        .notna()
        .astype(int)
    )


    df["has_gsr_data"] = (
        df["gsr_variability"]
        .notna()
        .astype(int)
    )


    df["has_resp_data"] = (
        df["resp_variability"]
        .notna()
        .astype(int)
    )



    # --------------------------------------------------------
    # Encode source
    # --------------------------------------------------------

    print("\nEncoding source...")


    df["source_encoded"] = (
        df["source"]
        .map(
            {
                "NUBD": 0,
                "NASA_OSDR": 1
            }
        )
    )



    # --------------------------------------------------------
    # Remove identifiers
    # --------------------------------------------------------

    print("\nRemoving identifiers...")


    df = df.drop(
        columns=[
            "subject_id",
            "source"
        ]
    )



    # --------------------------------------------------------
    # Missing values treatment
    # --------------------------------------------------------

    print("\nMissing values before:")
    print(
        df.isna().sum()
    )


    numeric_columns = (
        df.select_dtypes(
            include=np.number
        )
        .columns
    )


    for col in numeric_columns:

        df[col] = (
            df[col]
            .fillna(
                df[col].median()
            )
        )



    # --------------------------------------------------------
    # Final verification
    # --------------------------------------------------------

    print("\nMissing values after:")
    print(
        df.isna().sum()
    )


    print("\nFinal dataset:")
    print(
        df.head()
    )


    print("\nShape:")
    print(
        df.shape
    )



    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    df.to_parquet(
        OUTPUT_PATH,
        index=False
    )


    print("\nSaved:")
    print(
        OUTPUT_PATH
    )



if __name__ == "__main__":
    main()