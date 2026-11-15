"""
Novapulse - Feature Analysis

Input:
    data/processed/unified_features.parquet

Output:
    reports/feature_analysis/
"""

from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt


# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_PATH = (
    BASE_DIR /
    "data" /
    "processed" /
    "unified_features_v2.parquet"
)

REPORT_DIR = (
    BASE_DIR /
    "reports" /
    "feature_analysis"
)

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True
)



# ============================================================
# Load
# ============================================================

def load_dataset():

    print("\nChargement dataset...")

    df = pd.read_parquet(DATA_PATH)

    return df



# ============================================================
# General information
# ============================================================

def general_analysis(df):

    print("\n" + "="*70)
    print("INFORMATIONS GENERALES")
    print("="*70)


    print("\nShape:")
    print(df.shape)


    print("\nColonnes:")
    print(df.columns.tolist())


    print("\nTypes:")
    print(df.info())


    print("\nValeurs manquantes:")
    missing = df.isna().sum()

    print(
        missing[
            missing > 0
        ]
    )



# ============================================================
# Statistics
# ============================================================

def statistics(df):

    print("\n" + "="*70)
    print("STATISTIQUES")
    print("="*70)


    print(
        df.describe(
            include="all"
        )
    )



# ============================================================
# Source analysis
# ============================================================

def source_analysis(df):

    print("\n" + "="*70)
    print("DISTRIBUTION DES SOURCES")
    print("="*70)


    print(
        df["source"]
        .value_counts()
    )



# ============================================================
# Feature analysis
# ============================================================

def feature_analysis(df):

    numeric = (
        df
        .select_dtypes(
            include=np.number
        )
        .columns
    )


    print("\nFeatures numériques:")
    print(
        list(numeric)
    )


    print("\nCORRELATIONS")

    corr = (
        df[numeric]
        .corr()
    )


    print(corr)



    corr.to_csv(
        REPORT_DIR /
        "correlations.csv"
    )



# ============================================================
# Missing by source
# ============================================================

def missing_by_source(df):

    print("\n" + "="*70)
    print("MISSING VALUES PAR SOURCE")
    print("="*70)


    result = (
        df
        .groupby("source")
        .apply(
            lambda x:
            x.isna().sum()
        )
    )


    print(result)


    result.to_csv(
        REPORT_DIR /
        "missing_by_source.csv"
    )



# ============================================================
# Distribution plots
# ============================================================

def distributions(df):

    print("\nCréation distributions...")


    numeric = (
        df
        .select_dtypes(
            include=np.number
        )
        .columns
    )


    for col in numeric:

        plt.figure(
            figsize=(8,5)
        )

        df[col].hist(
            bins=30
        )

        plt.title(
            f"Distribution {col}"
        )

        plt.xlabel(col)

        plt.ylabel(
            "count"
        )


        plt.savefig(
            REPORT_DIR /
            f"{col}_distribution.png"
        )

        plt.close()



# ============================================================
# Outliers
# ============================================================

def detect_outliers(df):

    print("\n" + "="*70)
    print("OUTLIERS")
    print("="*70)


    numeric = (
        df
        .select_dtypes(
            include=np.number
        )
        .columns
    )


    results=[]


    for col in numeric:

        q1 = df[col].quantile(0.25)

        q3 = df[col].quantile(0.75)

        iqr = q3-q1


        lower = q1 - 1.5*iqr

        upper = q3 + 1.5*iqr


        count = (
            ((df[col]<lower)
            |
            (df[col]>upper))
            .sum()
        )


        results.append(
            {
                "feature":col,
                "outliers":count
            }
        )


    result = pd.DataFrame(results)

    print(result)


    result.to_csv(
        REPORT_DIR /
        "outliers.csv",
        index=False
    )



# ============================================================
# Main
# ============================================================

def main():

    print("="*70)
    print("NOVAPULSE FEATURE ANALYSIS")
    print("="*70)


    df = load_dataset()


    general_analysis(df)

    statistics(df)

    source_analysis(df)

    missing_by_source(df)

    feature_analysis(df)

    distributions(df)

    detect_outliers(df)



    print("\n" + "="*70)
    print("ANALYSE TERMINEE")
    print("="*70)


    print(
        "\nRapports générés dans:"
    )

    print(REPORT_DIR)



if __name__ == "__main__":
    main()