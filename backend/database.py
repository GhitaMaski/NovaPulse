"""
NovaPulse SQLite Database Layer (NASA Space Apps 2026)
Matches Section 8.3 schema for server persistence and ground station simulation.
"""

from __future__ import annotations
import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_FILE = Path(__file__).parent / "data" / "novapulse.db"


def get_db_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    target = db_path or Path(os.getenv("NOVAPULSE_DB_PATH") or DB_FILE)
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target))
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Optional[Path] = None) -> None:
    conn = get_db_connection(db_path)
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS crew (
            id TEXT PRIMARY KEY,
            name TEXT,
            role TEXT,
            profile_json TEXT
        );

        CREATE TABLE IF NOT EXISTS readings (
            crew_id TEXT,
            day INTEGER,
            data_json TEXT,
            PRIMARY KEY (crew_id, day)
        );

        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            type TEXT,
            start_day INTEGER,
            end_day INTEGER,
            source TEXT,
            magnitude TEXT,
            meta_json TEXT
        );

        CREATE TABLE IF NOT EXISTS audit (
            seq INTEGER PRIMARY KEY,
            ts TEXT,
            actor TEXT,
            type TEXT,
            payload_hash TEXT,
            prev_hash TEXT,
            hash TEXT
        );

        CREATE TABLE IF NOT EXISTS ground_reports (
            id TEXT PRIMARY KEY,
            day_from INTEGER,
            day_to INTEGER,
            summary_json TEXT,
            signature TEXT,
            sent_at TEXT,
            deliver_at TEXT
        );
        """
    )
    conn.commit()
    conn.close()


def seed_database_if_empty(
    sim_data: Dict[str, Any], db_path: Optional[Path] = None
) -> None:
    """Populates SQLite tables with initial simulated mission data if crew table is empty."""
    conn = get_db_connection(db_path)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) as cnt FROM crew")
    if cur.fetchone()["cnt"] > 0:
        conn.close()
        return

    # Seed Crew
    crew_records = [
        (c["id"], c["name"], c["role"], json.dumps(c))
        for c in sim_data.get("crew", [])
    ]
    cur.executemany(
        "INSERT INTO crew (id, name, role, profile_json) VALUES (?, ?, ?, ?)",
        crew_records,
    )

    # Seed Events
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

    # Seed Readings
    reading_records = [
        (r["crewId"], r["day"], json.dumps(r))
        for r in sim_data.get("readings", [])
    ]
    cur.executemany(
        "INSERT OR REPLACE INTO readings (crew_id, day, data_json) VALUES (?, ?, ?)",
        reading_records,
    )

    conn.commit()
    conn.close()
