"""
NovaPulse Comprehensive Backend Test Suite (NASA Space Apps 2026)
Tests simulator reproducibility, all API endpoints, Pydantic bounds validation,
audit log SHA-256 hash-chaining with tamper detection, ECDSA ground station
report verification, and Isolation Forest ML anomaly scoring.
"""

from __future__ import annotations
import base64
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
import pytest
from pydantic import ValidationError
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).parents[2]))

from backend.app.main import (
    append_audit,
    get_anomaly_scores,
    get_crew,
    get_events,
    get_ground_reports,
    get_health,
    get_mission,
    get_readings,
    get_space_weather,
    ingest_readings,
    inject_scenario,
    reset_scenarios,
    submit_checkin,
    submit_ground_report,
    verify_audit,
)
from backend.audit import AuditManager, compute_entry_hash, compute_genesis_hash
from backend.database import get_db_connection, init_db, seed_database_if_empty
from backend.ground import GroundStation, generate_demo_keypair
from backend.models import (
    AuditEntry,
    CheckIn,
    GroundReportSubmitRequest,
    Reading,
    ScenarioInjectRequest,
)
from sim.simulate import BOUNDS, CREW_PROFILES, Simulator


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Give each test its own simulated mission database."""
    monkeypatch.setenv("NOVAPULSE_DB_PATH", str(tmp_path / "novapulse.db"))
    init_db()
    sim = Simulator(seed=42)
    sim_data = sim.generate_mission()
    seed_database_if_empty(sim_data)


# ============================================================================
# 1. Simulator & Data Tests (Section 7, 13.3, 18.1)
# ============================================================================


def test_simulator_reproducibility():
    """NFR-09: Identical seed produces byte-identical mission dataset."""
    sim1 = Simulator(seed=12345)
    sim2 = Simulator(seed=12345)

    data1 = sim1.generate_mission(days=50)
    data2 = sim2.generate_mission(days=50)

    json1 = json.dumps(data1, sort_keys=True)
    json2 = json.dumps(data2, sort_keys=True)
    assert json1 == json2, "Simulations with identical seed must match exactly"


def test_simulator_validation_ranges():
    """Section 13.3: Every simulated reading must fall within physiological plausibility limits."""
    sim = Simulator(seed=42)
    data = sim.generate_mission(days=200)

    assert len(data["readings"]) == 600  # 3 crew * 200 days
    for r in data["readings"]:
        for k, (min_v, max_v) in BOUNDS.items():
            if k in r and r[k] is not None:
                val = r[k]
                assert (
                    min_v <= val <= max_v
                ), f"Value {val} for indicator '{k}' on day {r['day']} violated [{min_v}, {max_v}]"


# ============================================================================
# 2. API Endpoints Logic Tests (Section 13.1)
# ============================================================================


def test_get_health():
    res = get_health()
    assert res["status"] == "healthy"
    assert res["version"] == "1.0.0"


def test_get_mission():
    res = get_mission()
    assert res["seed"] == 42
    assert res["totalDays"] == 200
    assert res["careerLimitMsv"] == 600.0


def test_get_crew():
    crew = get_crew()
    assert len(crew) == 3
    ids = {c["id"] for c in crew}
    assert ids == {"CREW-01", "CREW-02", "CREW-03"}


def test_get_readings_filtering():
    # Filter by crewId and day range
    readings = get_readings(crewId="CREW-02", from_day=10, to_day=15)
    assert len(readings) == 6
    assert all(r["crewId"] == "CREW-02" for r in readings)
    assert [r["day"] for r in readings] == [10, 11, 12, 13, 14, 15]


def test_ingest_readings_valid():
    valid_data = {
        "crewId": "CREW-02",
        "day": 51,
        "restingHr": 74.0,
        "hrv": 38.0,
        "sbp": 125.0,
        "dbp": 80.0,
        "spo2": 96.5,
        "coreTemp": 37.3,
        "respRate": 17.0,
        "sleepHours": 5.9,
        "sleepEff": 79.0,
        "exerciseMin": 45.0,
        "resistanceLoad": 60.0,
        "symptoms": ["cough"],
        "doseMsv": 1.9,
        "cabinCo2": 720.0,
        "cabinTemp": 21.8,
        "cabinRh": 46.0,
    }
    reading_model = Reading(**valid_data)
    from fastapi import Response

    res = ingest_readings(reading_model, response=Response())
    assert res["accepted"] is True
    assert res["id"] == "CREW-02:51"


def test_ingest_readings_bounds_rejection():
    """Section 13.3: Rejects impossible values (e.g. HR > 250 bpm)."""
    with pytest.raises(ValidationError) as exc_info:
        Reading(
            crewId="CREW-01",
            day=5,
            restingHr=350.0,  # Violates ge=25, le=250
            hrv=50.0,
            sbp=120.0,
            dbp=80.0,
            spo2=98.0,
            coreTemp=36.6,
            respRate=14.0,
            sleepHours=7.0,
            sleepEff=85.0,
            exerciseMin=60.0,
            resistanceLoad=70.0,
            doseMsv=1.84,
            cabinCo2=600.0,
            cabinTemp=21.0,
            cabinRh=45.0,
        )
    assert "restingHr" in str(exc_info.value)


def test_submit_checkin():
    checkin = CheckIn(
        crewId="CREW-01",
        day=12,
        mood=3.5,
        fatigue=2.5,
        stress=2.0,
        symptoms=["mild headache"],
        reactionMs=270.0,
    )
    res = submit_checkin(checkin)
    assert res["accepted"] is True
    assert res["crewId"] == "CREW-01"

    # Verify that the reading in DB was updated with checkin fields
    readings = get_readings(crewId="CREW-01", from_day=12, to_day=12)
    assert len(readings) == 1
    assert readings[0]["mood"] == 3.5
    assert "mild headache" in readings[0]["symptoms"]


def test_get_events():
    events = get_events(from_day=40, to_day=60, source=None)
    assert any(e["type"] == "infection" for e in events)


def test_space_weather_service():
    events = get_space_weather(type="FLR")
    assert isinstance(events, list)
    assert len(events) > 0
    assert all("type" in e for e in events)


def test_scenario_injection_and_reset():
    req = ScenarioInjectRequest(
        type="infection",
        crewIds=["CREW-02"],
        startDay=47,
        durationDays=10,
        intensity=0.8,
    )
    res = inject_scenario(req)
    assert res["event"]["type"] == "infection"
    assert len(res["affectedDays"]) == 10

    # Reset
    reset_res = reset_scenarios()
    assert reset_res["status"] == "reset_to_default"


def test_anomaly_detection_isolation_forest():
    scores = get_anomaly_scores(crewId="CREW-02")
    assert len(scores) == 200
    assert all(0.0 <= s["anomalyScore"] <= 100.0 for s in scores)
    assert all("isAnomaly" in s for s in scores)


# ============================================================================
# 3. Security, Audit Log & Cryptography Tests (Section 11)
# ============================================================================


def test_audit_chain_and_tamper_detection():
    """NFR-04: Editing any past log entry breaks hash-chain verification."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM audit")
    conn.commit()

    manager = AuditManager(mission_id="mission-mars-2026")
    genesis = manager.genesis_hash

    # Entry 1
    h1 = compute_entry_hash(1, "2026-11-12T09:00:00Z", "CREW-01", "INGEST", "hashA", genesis)
    manager.append_entry(conn, 1, "2026-11-12T09:00:00Z", "CREW-01", "INGEST", "hashA", genesis, h1)

    # Entry 2
    h2 = compute_entry_hash(2, "2026-11-12T10:00:00Z", "CREW-02", "CHECKIN", "hashB", h1)
    manager.append_entry(conn, 2, "2026-11-12T10:00:00Z", "CREW-02", "CHECKIN", "hashB", h1, h2)

    # Verify log is intact
    v1 = manager.verify_chain(conn)
    assert v1["valid"] is True
    assert v1["count"] == 2
    assert v1["headHash"] == h2

    # Verify via endpoint
    endpoint_verify = verify_audit()
    assert endpoint_verify["valid"] is True

    # Tamper simulation: silently change payload hash of record 1
    cur.execute("UPDATE audit SET payload_hash = 'TAMPERED_PAYLOAD_HASH' WHERE seq = 1")
    conn.commit()

    # Verification must fail and explicitly name entry 1
    v2 = manager.verify_chain(conn)
    assert v2["valid"] is False
    assert v2["brokenSeq"] == 1
    assert "tamper detected" in v2["error"]

    conn.close()


def test_ground_report_submission_and_ecdsa_signature():
    """Section 11.4: Ground report ECDSA P-256 signature verification & light delay."""
    priv_key, pub_pem = generate_demo_keypair()
    station = GroundStation(public_key_pem=pub_pem, delay_seconds=720, time_compression=60)

    summary_b64 = base64.b64encode(b'{"test": "payload"}').decode("utf-8")
    chain_head = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    # Valid signature creation
    message = (summary_b64 + chain_head).encode("utf-8")
    sig_bytes = priv_key.sign(message, ec.ECDSA(hashes.SHA256()))
    sig_b64 = base64.b64encode(sig_bytes).decode("utf-8")

    # Verification must succeed
    assert station.verify_signature(summary_b64, chain_head, sig_b64) is True

    # Tampered signature / altered payload must fail
    assert station.verify_signature(summary_b64, "altered_chain_head", sig_b64) is False

    # Test via endpoint submission
    report_req = GroundReportSubmitRequest(
        dayFrom=80,
        dayTo=97,
        summary=summary_b64,
        chainHead=chain_head,
        signature=sig_b64,
        sentAt="2026-11-12T09:14:00Z",
    )
    sub_res = submit_ground_report(report_req)
    assert "id" in sub_res
    assert "deliverAt" in sub_res
