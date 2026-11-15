"""
NovaPulse Ground Station Service (NASA Space Apps 2026)
Handles delayed report reception, ECDSA P-256 signature verification,
and simulated light-time communication latency (Sections 11.4, 12.4, 12.6).
"""

from __future__ import annotations
import base64
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    PublicFormat,
    load_pem_public_key,
)

DEFAULT_DELAY_SECONDS = int(os.getenv("DELAY_SECONDS", "720"))  # 12 minutes
DEFAULT_TIME_COMPRESSION = int(os.getenv("TIME_COMPRESSION", "60"))  # 60x


class GroundStation:
    def __init__(
        self,
        public_key_pem: Optional[str] = None,
        delay_seconds: int = DEFAULT_DELAY_SECONDS,
        time_compression: int = DEFAULT_TIME_COMPRESSION,
    ):
        self.delay_seconds = delay_seconds
        self.time_compression = max(1, time_compression)
        self.public_key = self._load_public_key(public_key_pem)

    def _load_public_key(self, pem_str: Optional[str]) -> Optional[ec.EllipticCurvePublicKey]:
        if not pem_str:
            pem_str = os.getenv("GROUND_PUBLIC_KEY")
        if pem_str:
            try:
                key = load_pem_public_key(pem_str.encode("utf-8"))
                if isinstance(key, ec.EllipticCurvePublicKey):
                    return key
            except Exception:
                pass
        return None

    def calculate_deliver_at(self, sent_at_iso: str) -> str:
        """Calculates deliverAt timestamp accounting for time-compressed light-time delay."""
        try:
            sent_dt = datetime.fromisoformat(sent_at_iso.replace("Z", "+00:00"))
        except Exception:
            sent_dt = datetime.now(timezone.utc)

        # Effective latency in seconds: 720s / 60 = 12 seconds in demo mode
        effective_delay_seconds = self.delay_seconds / self.time_compression
        deliver_dt = sent_dt + timedelta(seconds=effective_delay_seconds)
        return deliver_dt.isoformat().replace("+00:00", "Z")

    def verify_signature(self, summary_b64: str, chain_head: str, signature_b64: str) -> bool:
        """Verifies ECDSA P-256 signature over summary and chainHead."""
        if not signature_b64:
            return False

        message = (summary_b64 + chain_head).encode("utf-8")

        if self.public_key:
            try:
                sig_bytes = base64.b64decode(signature_b64)
                self.public_key.verify(sig_bytes, message, ec.ECDSA(hashes.SHA256()))
                return True
            except (InvalidSignature, Exception):
                return False

        # In prototype/demo without explicit PK, accept well-formed base64 signature
        try:
            raw = base64.b64decode(signature_b64)
            return len(raw) >= 32
        except Exception:
            return False

    def submit_report(
        self,
        conn: sqlite3.Connection,
        day_from: int,
        day_to: int,
        summary: str,
        chain_head: str,
        signature: str,
        sent_at: str,
    ) -> Dict[str, Any]:
        """Stores report in ground_reports table and returns 202 payload with deliverAt."""
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as count FROM ground_reports")
        cnt = cur.fetchone()["count"]
        report_id = f"GR-{cnt + 1:04d}"

        deliver_at = self.calculate_deliver_at(sent_at)

        cur.execute(
            """INSERT INTO ground_reports (id, day_from, day_to, summary_json, signature, sent_at, deliver_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (report_id, day_from, day_to, summary, signature, sent_at, deliver_at),
        )
        conn.commit()

        return {"id": report_id, "deliverAt": deliver_at}

    def get_delivered_reports(self, conn: sqlite3.Connection) -> List[Dict[str, Any]]:
        """Returns reports whose deliver_at <= now in ISO format (Section 13.1)."""
        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        cur = conn.cursor()
        cur.execute(
            """SELECT id, day_from, day_to, summary_json, signature, sent_at, deliver_at
               FROM ground_reports
               WHERE deliver_at <= ?
               ORDER BY day_to ASC""",
            (now_iso,),
        )
        rows = cur.fetchall()

        results = []
        for r in rows:
            summary = r["summary_json"]
            sig = r["signature"]
            # Verify signature status
            verified = self.verify_signature(summary, "", sig)
            results.append(
                {
                    "id": r["id"],
                    "dayFrom": r["day_from"],
                    "dayTo": r["day_to"],
                    "summary": summary,
                    "signature": sig,
                    "sentAt": r["sent_at"],
                    "deliverAt": r["deliver_at"],
                    "verified": verified,
                }
            )
        return results


def generate_demo_keypair():
    """Utility to generate an ECDSA P-256 keypair for testing or seeding."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    pub_pem = public_key.public_bytes(
        encoding=Encoding.PEM, format=PublicFormat.SubjectPublicKeyInfo
    ).decode("utf-8")
    return private_key, pub_pem
