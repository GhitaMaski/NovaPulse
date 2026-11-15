"""
NovaPulse NASA DONKI Service (NASA Space Apps 2026)
Handles live queries to NASA Space Weather Database (api.nasa.gov/DONKI),
in-memory 1-hour caching, rate-limit protection, and static snapshot fallback.
"""

from __future__ import annotations
import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import requests

logger = logging.getLogger(__name__)

NASA_API_BASE = "https://api.nasa.gov/DONKI"
DEFAULT_SNAPSHOT_PATH = Path(__file__).parent / "data" / "donki_snapshot.json"
CACHE_TTL_SECONDS = 3600  # 1 hour per Section 13.4


class DonkiService:
    def __init__(
        self,
        api_key: Optional[str] = None,
        snapshot_path: Optional[Path] = None,
        start_date: str = "2024-02-01",
    ):
        self.api_key = api_key or os.getenv("NASA_API_KEY", "DEMO_KEY")
        self.snapshot_path = snapshot_path or DEFAULT_SNAPSHOT_PATH
        self.start_date_mission = datetime.fromisoformat(start_date)
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._snapshot_events = self._load_snapshot()

    def _load_snapshot(self) -> List[Dict[str, Any]]:
        if self.snapshot_path.exists():
            try:
                with open(self.snapshot_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load DONKI snapshot: {e}")
        return []

    def _date_to_mission_day(self, date_str: str) -> int:
        """Converts an ISO/UTC date string to mission day (1..200)."""
        try:
            dt = datetime.fromisoformat(date_str.split("T")[0].replace("Z", ""))
            delta = (dt - self.start_date_mission).days + 1
            return max(1, min(200, delta))
        except Exception:
            return 1

    def fetch_live_events(
        self,
        event_type: str = "all",
        start_date: str = "2024-02-01",
        end_date: str = "2024-08-18",
    ) -> List[Dict[str, Any]]:
        """Queries NASA DONKI API with in-memory caching and fallback."""
        cache_key = f"{event_type}:{start_date}:{end_date}"
        now = time.time()

        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if now - entry["timestamp"] < CACHE_TTL_SECONDS:
                return entry["data"]

        endpoints = {
            "FLR": f"{NASA_API_BASE}/FLR?startDate={start_date}&endDate={end_date}&api_key={self.api_key}",
            "SEP": f"{NASA_API_BASE}/SEP?startDate={start_date}&endDate={end_date}&api_key={self.api_key}",
            "CME": f"{NASA_API_BASE}/CME?startDate={start_date}&endDate={end_date}&api_key={self.api_key}",
            "GST": f"{NASA_API_BASE}/GST?startDate={start_date}&endDate={end_date}&api_key={self.api_key}",
            "IPS": f"{NASA_API_BASE}/IPS?startDate={start_date}&endDate={end_date}&api_key={self.api_key}",
        }

        types_to_fetch = [event_type.upper()] if event_type.upper() in endpoints else list(endpoints.keys())
        parsed_events: List[Dict[str, Any]] = []

        try:
            for t in types_to_fetch:
                url = endpoints[t]
                res = requests.get(url, timeout=5)
                if res.status_code == 200:
                    raw_items = res.json()
                    for item in raw_items:
                        # Extract date and magnitude
                        event_date = item.get("flrStartTime") or item.get("eventTime") or item.get("startTime") or start_date
                        m_day = self._date_to_mission_day(str(event_date))
                        mag = (
                            item.get("classType")
                            or item.get("speed")
                            or item.get("kpIndex")
                            or "Standard"
                        )
                        parsed_events.append(
                            {
                                "id": f"DONKI-{t}-{item.get('activityID', str(m_day))}",
                                "type": t,
                                "startDay": m_day,
                                "endDay": min(200, m_day + 2),
                                "source": "donki",
                                "magnitude": str(mag),
                                "details": item.get("note", f"NASA DONKI {t} notification"),
                            }
                        )
                else:
                    logger.warning(f"DONKI API {t} status {res.status_code}, falling back to snapshot")
                    return self.get_snapshot_events(event_type)

            self._cache[cache_key] = {"timestamp": now, "data": parsed_events}
            return parsed_events

        except Exception as e:
            logger.warning(f"DONKI fetch failed ({e}), falling back to bundled snapshot")
            return self.get_snapshot_events(event_type)

    def get_snapshot_events(
        self,
        event_type: Optional[str] = None,
        from_day: Optional[int] = None,
        to_day: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Returns filtered space-weather events from the bundled snapshot."""
        results = []
        for e in self._snapshot_events:
            if event_type and event_type.upper() != "ALL" and e["type"] != event_type.upper():
                continue
            if from_day is not None and e["endDay"] < from_day:
                continue
            if to_day is not None and e["startDay"] > to_day:
                continue
            results.append(e)
        return results
