"""
NovaPulse Pydantic Data Models and Validation (NASA Space Apps 2026)
Matches shared TypeScript interfaces (Section 8.2) and API specifications (Section 13).
"""

from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


Domain = Literal["cardio", "immune", "bone_muscle", "behavioral", "radiation"]
Severity = Literal["info", "watch", "warning", "critical"]
Band = Literal["green", "amber", "red"]
Confidence = Literal["low", "medium", "high"]


class ErrorDetail(BaseModel):
    code: str
    message: str
    fields: Optional[List[str]] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class CrewMemberProfile(BaseModel):
    id: str
    name: str
    role: str
    baselines: Dict[str, float]
    spreads: Dict[str, float]


class Reading(BaseModel):
    id: Optional[str] = None
    crewId: str
    day: int = Field(ge=1, le=200)
    date: Optional[str] = None
    restingHr: float = Field(ge=25.0, le=250.0)
    hrv: float = Field(ge=1.0, le=300.0)
    sbp: float = Field(ge=60.0, le=260.0)
    dbp: float = Field(ge=30.0, le=160.0)
    spo2: float = Field(ge=50.0, le=100.0)
    coreTemp: float = Field(ge=30.0, le=43.0)
    respRate: float = Field(ge=4.0, le=60.0)
    sleepHours: float = Field(ge=0.0, le=16.0)
    sleepEff: float = Field(ge=0.0, le=100.0)
    exerciseMin: float = Field(ge=0.0, le=600.0)
    resistanceLoad: float = Field(ge=0.0, le=100.0)
    gripKg: Optional[float] = Field(default=None, ge=0.0, le=120.0)
    boneMarker: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    mood: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    fatigue: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    stress: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    reactionMs: Optional[float] = Field(default=None, ge=100.0, le=2000.0)
    symptoms: List[str] = Field(default_factory=list)
    doseMsv: float = Field(ge=0.0, le=200.0)
    cabinCo2: float = Field(ge=300.0, le=20000.0)
    cabinTemp: float = Field(ge=5.0, le=45.0)
    cabinRh: float = Field(ge=0.0, le=100.0)

    @model_validator(mode="before")
    def set_id_if_missing(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if "id" not in values or not values["id"]:
                c_id = values.get("crewId", "CREW-01")
                day = values.get("day", 1)
                values["id"] = f"{c_id}:{day}"
        return values


class CheckIn(BaseModel):
    crewId: str
    day: int = Field(ge=1, le=200)
    mood: float = Field(ge=1.0, le=5.0)
    fatigue: float = Field(ge=1.0, le=5.0)
    stress: float = Field(ge=1.0, le=5.0)
    symptoms: List[str] = Field(default_factory=list)
    reactionMs: Optional[float] = Field(default=None, ge=100.0, le=2000.0)
    socialContactMin: Optional[float] = Field(default=None, ge=0.0, le=1440.0)


class SpaceEvent(BaseModel):
    id: str
    type: str
    startDay: int
    endDay: int
    source: Literal["donki", "scenario", "injected"]
    magnitude: Optional[str] = None
    crewIds: Optional[List[str]] = None
    details: Optional[str] = None


class ScenarioInjectRequest(BaseModel):
    type: str
    crewIds: List[str]
    startDay: int = Field(ge=1, le=200)
    durationDays: int = Field(ge=1, le=200)
    intensity: float = Field(default=0.8, ge=0.1, le=1.0)


class GroundReportSubmitRequest(BaseModel):
    dayFrom: int
    dayTo: int
    summary: str  # base64 encoded compressed payload
    chainHead: str
    signature: str  # base64 ECDSA signature
    sentAt: str


class GroundReport(BaseModel):
    id: str
    dayFrom: int
    dayTo: int
    summary: str
    chainHead: str
    signature: str
    sentAt: str
    deliverAt: str
    verified: bool = False


class AuditEntry(BaseModel):
    seq: int
    ts: str
    actor: str
    type: str
    payloadHash: str
    prevHash: str
    hash: str


class MissionConfig(BaseModel):
    seed: int
    totalDays: int
    startDate: str
    defaultOneWayDelaySec: int
    timeCompression: int
    careerLimitMsv: float
    generatedAt: str
