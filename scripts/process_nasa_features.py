import pandas as pd
import numpy as np
from pathlib import Path
from scipy.signal import welch


NASA_DIR = Path("data/raw/nasa/extracted")

OUTPUT = Path(
    "data/processed/nasa_features_v2.parquet"
)


# =========================
# EEG FEATURES
# =========================

def extract_eeg_features(signal, fs=256):

    freqs, psd = welch(
        signal,
        fs=fs
    )

    alpha = psd[
        (freqs >= 8) &
        (freqs <= 12)
    ].mean()


    beta = psd[
        (freqs >= 13) &
        (freqs <= 30)
    ].mean()


    theta = psd[
        (freqs >= 4) &
        (freqs <= 7)
    ].mean()


    return {

        "alpha_power": alpha,

        "beta_power": beta,

        "theta_power": theta,

        "alpha_beta_ratio":
            alpha / (beta + 1e-8),

        "theta_alpha_ratio":
            theta / (alpha + 1e-8)

    }



# =========================
# ECG
# =========================

def extract_ecg_features(df):

    ecg = df["ECG"]


    return {

        "ecg_mean":
            ecg.mean(),

        "ecg_std":
            ecg.std(),

        "ecg_range":
            ecg.max()-ecg.min()

    }



# =========================
# GSR
# =========================

def extract_gsr_features(df):

    gsr = df["GSR"]


    return {

        "gsr_mean":
            gsr.mean(),

        "gsr_std":
            gsr.std(),

        "gsr_range":
            gsr.max()-gsr.min(),

        "gsr_variability":
            gsr.diff().std()

    }



# =========================
# RESPIRATION
# =========================

def extract_resp_features(df):

    r = df["R"]


    return {

        "resp_mean":
            r.mean(),

        "resp_std":
            r.std(),

        "resp_range":
            r.max()-r.min()

    }



# =========================
# FILE PROCESSING
# =========================

def process_file(file):

    print(
        "Traitement :",
        file.name
    )


    df = pd.read_csv(file)


    result={}


    parts=file.stem.split("_")


    result["subject_id"] = parts[0]

    result["condition"] = parts[1]


    # durée approximative

    result["samples"] = len(df)


    if "TimeSecs" in df.columns:

        result["duration_seconds"] = (
            df["TimeSecs"].max()
            -
            df["TimeSecs"].min()
        )



    if "ECG" in df.columns:

        result.update(
            extract_ecg_features(df)
        )


    if "GSR" in df.columns:

        result.update(
            extract_gsr_features(df)
        )


    if "R" in df.columns:

        result.update(
            extract_resp_features(df)
        )



    eeg_cols=[
        c for c in df.columns
        if c.startswith("EEG")
    ]


    if len(eeg_cols)>0:

        eeg_signal=df[eeg_cols[0]].dropna()

        result.update(
            extract_eeg_features(
                eeg_signal.values
            )
        )


    return result




# =========================
# MAIN
# =========================

def main():


    files=list(
        NASA_DIR.rglob("*.csv")
    )


    print(
        "Nombre fichiers :",
        len(files)
    )


    results=[]


    for file in files:

        try:

            results.append(
                process_file(file)
            )

        except Exception as e:

            print(
                "Erreur:",
                file,
                e
            )


    df=pd.DataFrame(results)


    print("\nDataset final")
    print(df.head())


    print(df.info())


    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True
    )


    df.to_parquet(
        OUTPUT,
        index=False
    )


    print(
        "\nSauvegardé :",
        OUTPUT
    )



if __name__=="__main__":

    main()