"""
NovaPulse FastAPI Backend Application (NASA Space Apps 2026)
Implements full REST API specification (Section 13.1) with OpenAPI documentation at /docs.
"""

from __future__ import annotations
import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from fastapi import FastAPI, HTTPException, Query, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Ensure root package can be imported
sys.path.insert(0, str(Path(__file__).parents[2]))

from sim.simulate import CREW_PROFILES, Simulator
from backend.models import (
    AuditEntry,
    CheckIn,
    ErrorDetail,
    ErrorResponse,
    GroundReport,
    GroundReportSubmitRequest,
    MissionConfig,
    Reading,
    ScenarioInjectRequest,
    SpaceEvent,
)
from backend.database import get_db_connection, init_db, seed_database_if_empty
from backend.donki import DonkiService
from backend.anomaly import AnomalyDetector
from backend.ground import GroundStation
from backend.audit import AuditManager
from backend.predictions import router as predictions_router

# Shared Services
simulator = Simulator()
donki_service = DonkiService()
anomaly_detector = AnomalyDetector()
ground_station = GroundStation()
audit_manager = AuditManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database and seed if empty
    init_db()
    sim_data = simulator.generate_mission()
    seed_database_if_empty(sim_data)
    yield


app = FastAPI(
    title="NovaPulse Spacecraft Health API",
    description="Offline-first Astronaut Health Monitoring, Space Weather and Ground Sync API for NASA Space Apps 2026.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)
app.include_router(predictions_router)

# CORS Configuration (Section 13.4 & 19.3)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Standard Error Handler matching Section 13.4 format:
# { "error": { "code": "validation_failed", "message": "...", "fields": [...] } }
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    field_errors = []
    for err in exc.errors():
        field_name = ".".join(str(loc) for loc in err["loc"] if loc != "body")
        field_errors.append(f"{field_name}: {err['msg']}")

    error_payload = {
        "error": {
            "code": "validation_failed",
            "message": "Input validation failed against physiological or system limits.",
            "fields": field_errors,
        }
    }
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=error_payload)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail, headers=exc.headers)
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content={
            "error": {
                "code": f"http_{exc.status_code}",
                "message": str(exc.detail),
                "fields": [],
            }
        },
    )


# ============================================================================
# API Endpoints (Section 13.1)
# ============================================================================


@app.get("/api/v1/health", summary="Liveness check and version")
def get_health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "NovaPulse Backend & Ground Station",
        "mode": "operational",
    }


@app.get("/api/v1/mission", summary="Mission configuration", response_model=MissionConfig)
def get_mission() -> Dict[str, Any]:
    return {
        "seed": simulator.seed,
        "totalDays": 200,
        "startDate": "2024-02-01",
        "defaultOneWayDelaySec": 720,
        "timeCompression": 60,
        "careerLimitMsv": 600.0,
        "generatedAt": "2024-02-01T00:00:00Z",
    }


@app.get("/api/v1/crew", summary="List crew members and baseline profiles")
def get_crew() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT profile_json FROM crew ORDER BY id ASC")
    rows = cur.fetchall()
    conn.close()
    if rows:
        return [json.loads(r["profile_json"]) for r in rows]
    return CREW_PROFILES


@app.get("/api/v1/readings", summary="Readings for a crew member and day range")
def get_readings(
    crewId: Optional[str] = Query(None, description="Crew member ID, e.g. CREW-01"),
    from_day: Optional[int] = Query(None, alias="from", ge=1, le=200),
    to_day: Optional[int] = Query(None, alias="to", ge=1, le=200),
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cur = conn.cursor()

    query = "SELECT data_json FROM readings WHERE 1=1"
    params: List[Any] = []

    if crewId:
        query += " AND crew_id = ?"
        params.append(crewId)
    if from_day is not None:
        query += " AND day >= ?"
        params.append(from_day)
    if to_day is not None:
        query += " AND day <= ?"
        params.append(to_day)

    query += " ORDER BY day ASC"
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    return [json.loads(r["data_json"]) for r in rows]


@app.post(
    "/api/v1/readings",
    summary="Ingest one or more readings (live feed mode)",
    status_code=status.HTTP_201_CREATED,
)
def ingest_readings(
    payload: Union[Reading, List[Reading]], response: Response
) -> Dict[str, Any]:
    readings_list = payload if isinstance(payload, list) else [payload]
    conn = get_db_connection()
    cur = conn.cursor()

    last_id = ""
    for r in readings_list:
        rec = r.model_dump()
        last_id = rec["id"]
        # Idempotent write
        cur.execute(
            "INSERT OR REPLACE INTO readings (crew_id, day, data_json) VALUES (?, ?, ?)",
            (rec["crewId"], rec["day"], json.dumps(rec)),
        )

    conn.commit()
    conn.close()

    return {"id": last_id, "accepted": True, "count": len(readings_list), "warnings": []}


@app.post(
    "/api/v1/checkins",
    summary="Submit daily check-in (mood, fatigue, stress, symptoms)",
    status_code=status.HTTP_201_CREATED,
)
def submit_checkin(checkin: CheckIn) -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT data_json FROM readings WHERE crew_id = ? AND day = ?",
        (checkin.crewId, checkin.day),
    )
    row = cur.fetchone()

    if row:
        reading_data = json.loads(row["data_json"])
        reading_data["mood"] = checkin.mood
        reading_data["fatigue"] = checkin.fatigue
        reading_data["stress"] = checkin.stress
        if checkin.symptoms:
            existing_symptoms = set(reading_data.get("symptoms", []))
            existing_symptoms.update(checkin.symptoms)
            reading_data["symptoms"] = list(existing_symptoms)
        if checkin.reactionMs is not None:
            reading_data["reactionMs"] = checkin.reactionMs

        cur.execute(
            "UPDATE readings SET data_json = ? WHERE crew_id = ? AND day = ?",
            (json.dumps(reading_data), checkin.crewId, checkin.day),
        )
        conn.commit()

    conn.close()
    return {"accepted": True, "crewId": checkin.crewId, "day": checkin.day}


@app.get("/api/v1/events", summary="Space-weather and injected events, merged")
def get_events(
    from_day: Optional[int] = Query(None, alias="from", ge=1, le=200),
    to_day: Optional[int] = Query(None, alias="to", ge=1, le=200),
    source: Optional[str] = Query(None, description="donki, scenario, or injected"),
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cur = conn.cursor()

    query = "SELECT meta_json FROM events WHERE 1=1"
    params: List[Any] = []

    if from_day is not None:
        query += " AND end_day >= ?"
        params.append(from_day)
    if to_day is not None:
        query += " AND start_day <= ?"
        params.append(to_day)
    if source and source.lower() != "all":
        query += " AND source = ?"
        params.append(source.lower())

    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    return [json.loads(r["meta_json"]) for r in rows]


@app.get(
    "/api/v1/space-weather",
    summary="Proxy to NASA DONKI with caching and snapshot fallback",
)
def get_space_weather(
    start: str = Query("2024-02-01", description="Start date YYYY-MM-DD"),
    end: str = Query("2024-08-18", description="End date YYYY-MM-DD"),
    type: str = Query("all", description="FLR, SEP, CME, GST, IPS or all"),
) -> List[Dict[str, Any]]:
    return donki_service.fetch_live_events(event_type=type, start_date=start, end_date=end)


@app.post("/api/v1/scenarios/inject", summary="Inject an event into the mission")
def inject_scenario(req: ScenarioInjectRequest) -> Dict[str, Any]:
    # Inject event into simulator
    evt = simulator.inject_event(
        event_type=req.type,
        crew_ids=req.crewIds,
        start_day=req.startDay,
        duration_days=req.durationDays,
        intensity=req.intensity,
    )

    # Re-simulate mission with new injected event and update DB
    sim_data = simulator.generate_mission()
    conn = get_db_connection()
    cur = conn.cursor()

    # Save event
    cur.execute(
        """INSERT OR REPLACE INTO events (id, type, start_day, end_day, source, magnitude, meta_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            evt["id"],
            evt["type"],
            evt["startDay"],
            evt["endDay"],
            evt["source"],
            evt["magnitude"],
            json.dumps(evt),
        ),
    )

    # Update readings for the affected window
    affected_days = list(range(req.startDay, min(200, req.startDay + req.durationDays)))
    for r in sim_data["readings"]:
        if r["crewId"] in req.crewIds and r["day"] in affected_days:
            cur.execute(
                "UPDATE readings SET data_json = ? WHERE crew_id = ? AND day = ?",
                (json.dumps(r), r["crewId"], r["day"]),
            )

    conn.commit()
    conn.close()

    return {"event": evt, "affectedDays": affected_days}


@app.post("/api/v1/scenarios/reset", summary="Return to the default storyline")
def reset_scenarios() -> Dict[str, Any]:
    simulator.reset_injections()
    sim_data = simulator.generate_mission()

    conn = get_db_connection()
    cur = conn.cursor()

    # Clear events and readings, then reseed with executemany
    cur.execute("DELETE FROM events")
    cur.execute("DELETE FROM readings")

    event_records = [
        (
            e["id"],
            e["type"],
            e["startDay"],
            e["endDay"],
            e.get("source", "scenario"),
            e.get("magnitude", ""),
            json.dumps(e),
        )
        for e in sim_data.get("events", [])
    ]
    cur.executemany(
        """INSERT INTO events (id, type, start_day, end_day, source, magnitude, meta_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        event_records,
    )

    reading_records = [
        (r["crewId"], r["day"], json.dumps(r))
        for r in sim_data.get("readings", [])
    ]
    cur.executemany(
        "INSERT INTO readings (crew_id, day, data_json) VALUES (?, ?, ?)",
        reading_records,
    )

    conn.commit()
    conn.close()

    return {"status": "reset_to_default", "totalDays": 200, "message": "Storyline reset."}


@app.get(
    "/api/v1/anomaly-scores",
    summary="Isolation Forest multivariate anomaly second opinion",
)
def get_anomaly_scores(
    crewId: str = Query("CREW-01", description="Crew member ID"),
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT data_json FROM readings WHERE crew_id = ? ORDER BY day ASC", (crewId,)
    )
    rows = cur.fetchall()
    conn.close()

    readings = [json.loads(r["data_json"]) for r in rows]
    if not readings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No readings found for crewId '{crewId}'",
        )

    return anomaly_detector.train_and_score_crew(readings)


@app.post(
    "/api/v1/ground/reports",
    summary="Ship submits a signed report (returns simulated delivery time)",
    status_code=status.HTTP_202_ACCEPTED,
)
def submit_ground_report(report_req: GroundReportSubmitRequest) -> Dict[str, Any]:
    conn = get_db_connection()
    result = ground_station.submit_report(
        conn=conn,
        day_from=report_req.dayFrom,
        day_to=report_req.dayTo,
        summary=report_req.summary,
        chain_head=report_req.chainHead,
        signature=report_req.signature,
        sent_at=report_req.sentAt,
    )
    conn.close()
    return result


@app.get(
    "/api/v1/ground/reports",
    summary="Ground view: only reports whose deliver_at has passed",
)
def get_ground_reports() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    delivered = ground_station.get_delivered_reports(conn)
    conn.close()
    return delivered


@app.post(
    "/api/v1/audit",
    summary="Append the audit head to the server copy (anchor)",
    status_code=status.HTTP_201_CREATED,
)
def append_audit(entry: AuditEntry) -> Dict[str, Any]:
    conn = get_db_connection()
    res = audit_manager.append_entry(
        conn=conn,
        seq=entry.seq,
        ts=entry.ts,
        actor=entry.actor,
        entry_type=entry.type,
        payload_hash=entry.payloadHash,
        prev_hash=entry.prevHash,
        provided_hash=entry.hash,
    )
    conn.close()
    return {"accepted": True, "seq": res["seq"], "hash": res["hash"]}


@app.get("/api/v1/audit/verify", summary="Verify the server's copy of the audit chain")
def verify_audit() -> Dict[str, Any]:
    conn = get_db_connection()
    result = audit_manager.verify_chain(conn)
    conn.close()
    return result


frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if (frontend_dist / "index.html").is_file():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
