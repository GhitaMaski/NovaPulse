"""Optional FastAPI interface for the separately supplied NovaPulse models."""

from __future__ import annotations

import logging
from pathlib import Path
from threading import Lock
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt


router = APIRouter(prefix="/api/v1/predict", tags=["AI predictions"])
logger = logging.getLogger(__name__)
prediction_lock = Lock()

MODEL_DIR = Path(__file__).resolve().parents[1] / "ai_engine" / "models" / "saved_models"
MODEL_FILES = (
    "health_model.pkl",
    "fatigue_model.pkl",
    "cardio_model.pkl",
    "sleep_model.pkl",
    "mission_status_model.pkl",
    "anomaly_model.pkl",
    "feature_columns.pkl",
)
LFS_POINTER_PREFIX = b"version https://git-lfs.github.com/spec/v1"

FeatureValue = Annotated[float, Field(strict=True, allow_inf_nan=False)]
BinaryInt = Annotated[int, Field(strict=True, ge=0, le=1)]
DataFlag = StrictBool | BinaryInt


class PredictionFeatures(BaseModel):
    """Inputs prepared in the same units and feature space as the trained models."""

    model_config = ConfigDict(extra="forbid")

    recovery_score: FeatureValue
    recovery_trend: FeatureValue
    cardiac_state: FeatureValue
    hr_variability: FeatureValue
    activity_score: FeatureValue
    activity_change: FeatureValue
    stress_index: FeatureValue
    stress_variability: FeatureValue
    cognitive_load: FeatureValue
    alpha_beta_ratio: FeatureValue
    theta_alpha_ratio: FeatureValue
    gsr_variability: FeatureValue
    resp_variability: FeatureValue
    has_recovery_data: DataFlag
    has_activity_data: DataFlag
    has_eeg_data: DataFlag
    has_gsr_data: DataFlag
    has_resp_data: DataFlag
    source_encoded: BinaryInt
    mission_day: StrictInt
    heart_rate: FeatureValue
    spo2: FeatureValue
    body_temperature: FeatureValue
    systolic_bp: FeatureValue
    diastolic_bp: FeatureValue
    sleep_hours: FeatureValue
    sleep_quality: FeatureValue
    sleep_efficiency: FeatureValue
    sleep_debt: FeatureValue
    cabin_co2: FeatureValue
    microgravity_days: StrictInt
    muscle_loss_index: FeatureValue
    bone_density_risk: FeatureValue
    radiation_dose: FeatureValue
    radiation_risk: FeatureValue


class PredictionResult(BaseModel):
    health_score: FeatureValue
    fatigue_risk: FeatureValue
    cardio_risk: FeatureValue
    sleep_risk: FeatureValue
    mission_status: str
    anomaly: str


class PredictionBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    readings: list[PredictionFeatures] = Field(min_length=1, max_length=600)


class PredictionStatus(BaseModel):
    status: Literal["artifacts_present", "unavailable"]
    missingArtifacts: list[str]


def _missing_artifacts() -> list[str]:
    missing = []
    for name in MODEL_FILES:
        try:
            with (MODEL_DIR / name).open("rb") as file:
                prefix = file.read(len(LFS_POINTER_PREFIX))
        except OSError:
            missing.append(name)
            continue
        if not prefix or prefix == LFS_POINTER_PREFIX:
            missing.append(name)
    return missing


def _unavailable(message: str, files: list[str]) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={"error": {"code": "ai_models_unavailable", "message": message, "fields": files}},
    )


@router.get("/status", summary="Check whether the model files are present")
def get_prediction_status() -> PredictionStatus:
    missing = _missing_artifacts()
    return PredictionStatus(
        status="unavailable" if missing else "artifacts_present",
        missingArtifacts=missing,
    )


def _run_predictions(readings: list[PredictionFeatures]) -> list[PredictionResult]:
    missing = _missing_artifacts()
    if missing:
        raise _unavailable("The trained NovaPulse model files are missing.", missing)

    if not prediction_lock.acquire(blocking=False):
        raise HTTPException(
            status_code=429,
            detail="A model prediction is already running. Try again in a moment.",
            headers={"Retry-After": "5"},
        )
    try:
        from ai_engine.models.predict import feature_columns, predict_batch

        expected = PredictionFeatures.model_fields.keys()
        if len(feature_columns) != len(expected) or set(feature_columns) != expected:
            raise _unavailable("The trained models use a different feature schema.", [])
        results = predict_batch([reading.model_dump() for reading in readings])
        return [PredictionResult.model_validate(result) for result in results]
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Could not run the NovaPulse models")
        raise _unavailable("The trained NovaPulse models could not complete the prediction.", []) from exc
    finally:
        prediction_lock.release()


@router.post(
    "",
    summary="Run the AI engine on 35 prepared model features",
    responses={503: {"description": "The trained model files are missing or incompatible"}},
)
def predict_health(features: PredictionFeatures) -> PredictionResult:
    return _run_predictions([features])[0]


@router.post("/batch", summary="Predict the results for up to 600 readings in input order")
def predict_scenario(batch: PredictionBatch) -> list[PredictionResult]:
    return _run_predictions(batch.readings)
