"""
NovaPulse Tamper-Evident Audit Log Service (NASA Space Apps 2026)
Implements SHA-256 hash-chaining and audit log verification (Section 8.2 & 11.3).
"""

from __future__ import annotations
import hashlib
import sqlite3
from typing import Any, Dict, List, Optional

DEFAULT_MISSION_ID = "mission-mars-2026"


def compute_genesis_hash(mission_id: str = DEFAULT_MISSION_ID) -> str:
    """Computes h_0 = SHA-256("NovaPulse-genesis" || missionId)."""
    raw = f"NovaPulse-genesis|{mission_id}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def compute_entry_hash(
    seq: int,
    ts: str,
    actor: str,
    entry_type: str,
    payload_hash: str,
    prev_hash: str,
) -> str:
    """Computes h_n = SHA-256(seq|ts|actor|type|payloadHash|prevHash)."""
    data_str = f"{seq}|{ts}|{actor}|{entry_type}|{payload_hash}|{prev_hash}"
    return hashlib.sha256(data_str.encode("utf-8")).hexdigest()


class AuditManager:
    def __init__(self, mission_id: str = DEFAULT_MISSION_ID):
        self.mission_id = mission_id
        self.genesis_hash = compute_genesis_hash(mission_id)

    def append_entry(
        self,
        conn: sqlite3.Connection,
        seq: int,
        ts: str,
        actor: str,
        entry_type: str,
        payload_hash: str,
        prev_hash: str,
        provided_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Appends a new audit record to the SQLite database."""
        computed = compute_entry_hash(
            seq, ts, actor, entry_type, payload_hash, prev_hash
        )
        final_hash = provided_hash or computed

        cur = conn.cursor()
        cur.execute(
            """INSERT INTO audit (seq, ts, actor, type, payload_hash, prev_hash, hash)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (seq, ts, actor, entry_type, payload_hash, prev_hash, final_hash),
        )
        conn.commit()

        return {
            "seq": seq,
            "ts": ts,
            "actor": actor,
            "type": entry_type,
            "payloadHash": payload_hash,
            "prevHash": prev_hash,
            "hash": final_hash,
        }

    def get_entries(self, conn: sqlite3.Connection) -> List[Dict[str, Any]]:
        cur = conn.cursor()
        cur.execute(
            "SELECT seq, ts, actor, type, payload_hash, prev_hash, hash FROM audit ORDER BY seq ASC"
        )
        rows = cur.fetchall()
        return [
            {
                "seq": r["seq"],
                "ts": r["ts"],
                "actor": r["actor"],
                "type": r["type"],
                "payloadHash": r["payload_hash"],
                "prevHash": r["prev_hash"],
                "hash": r["hash"],
            }
            for r in rows
        ]

    def verify_chain(self, conn: sqlite3.Connection) -> Dict[str, Any]:
        """Validates all hashes sequentially starting from genesis hash h_0."""
        entries = self.get_entries(conn)
        if not entries:
            return {
                "valid": True,
                "count": 0,
                "headHash": self.genesis_hash,
                "message": "Audit chain empty (at genesis state)",
            }

        expected_prev = self.genesis_hash

        for entry in entries:
            seq = entry["seq"]
            # Check prevHash continuity
            if entry["prevHash"] != expected_prev:
                return {
                    "valid": False,
                    "error": f"Chain broken at entry {seq}: prevHash mismatch",
                    "brokenSeq": seq,
                    "expected": expected_prev,
                    "actual": entry["prevHash"],
                }

            # Check hash computation integrity
            expected_hash = compute_entry_hash(
                seq=entry["seq"],
                ts=entry["ts"],
                actor=entry["actor"],
                entry_type=entry["type"],
                payload_hash=entry["payloadHash"],
                prev_hash=entry["prevHash"],
            )

            if entry["hash"] != expected_hash:
                return {
                    "valid": False,
                    "error": f"Record {seq} modified after it was logged (tamper detected)",
                    "brokenSeq": seq,
                    "expectedHash": expected_hash,
                    "actualHash": entry["hash"],
                }

            expected_prev = entry["hash"]

        return {
            "valid": True,
            "count": len(entries),
            "headHash": entries[-1]["hash"],
            "message": "Audit log verified: 100% intact",
        }
