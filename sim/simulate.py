"""
NovaPulse Mission Simulator (NASA Space Apps 2026)
Generates deterministic 200-day mission telemetry for a 3-person crew based on
an AR(1) autoregressive process, personal baseline profiles, space weather events,
and scripted/injectable scenario anomalies.
"""

from __future__ import annotations
import json
import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import yaml

# Reference constants
DEFAULT_SEED = 42
TOTAL_DAYS = 200
START_DATE = "2024-02-01"
BASELINE_DOSE_RATE = 1.84  # mSv/day (MSL RAD cruise baseline)
MAX_CAREER_DOSE_LIMIT = 600.0  # mSv (NASA-STD-3001)

CREW_PROFILES = [
    {
        "id": "CREW-01",
        "name": "Nadia Berrada",
        "role": "Commander",
        "baselines": {
            "restingHr": 58.0,
            "hrv": 62.0,
            "sbp": 115.0,
            "dbp": 75.0,
            "spo2": 98.2,
            "coreTemp": 36.6,
            "respRate": 14.0,
            "sleepHours": 7.0,
            "sleepEff": 88.0,
            "exerciseMin": 60.0,
            "resistanceLoad": 75.0,
            "gripKg": 38.0,
            "boneMarker": 20.0,
            "mood": 4.0,
            "fatigue": 2.0,
            "stress": 2.0,
            "reactionMs": 265.0,
            "socialContactMin": 90.0,
        },
        "spreads": {
            "restingHr": 2.2,
            "hrv": 4.5,
            "sbp": 4.0,
            "dbp": 3.0,
            "spo2": 0.6,
            "coreTemp": 0.12,
            "respRate": 1.0,
            "sleepHours": 0.4,
            "sleepEff": 3.0,
            "exerciseMin": 6.0,
            "resistanceLoad": 5.0,
            "gripKg": 1.5,
            "boneMarker": 2.0,
            "mood": 0.3,
            "fatigue": 0.4,
            "stress": 0.4,
            "reactionMs": 14.0,
            "socialContactMin": 15.0,
        },
    },
    {
        "id": "CREW-02",
        "name": "Leo Marek",
        "role": "Flight engineer",
        "baselines": {
            "restingHr": 66.0,
            "hrv": 48.0,
            "sbp": 120.0,
            "dbp": 78.0,
            "spo2": 97.5,
            "coreTemp": 36.7,
            "respRate": 15.0,
            "sleepHours": 6.5,
            "sleepEff": 84.0,
            "exerciseMin": 55.0,
            "resistanceLoad": 70.0,
            "gripKg": 46.0,
            "boneMarker": 22.0,
            "mood": 3.8,
            "fatigue": 2.2,
            "stress": 2.3,
            "reactionMs": 285.0,
            "socialContactMin": 75.0,
        },
        "spreads": {
            "restingHr": 2.5,
            "hrv": 4.0,
            "sbp": 4.5,
            "dbp": 3.2,
            "spo2": 0.7,
            "coreTemp": 0.14,
            "respRate": 1.1,
            "sleepHours": 0.45,
            "sleepEff": 3.5,
            "exerciseMin": 5.0,
            "resistanceLoad": 5.0,
            "gripKg": 1.8,
            "boneMarker": 2.2,
            "mood": 0.35,
            "fatigue": 0.4,
            "stress": 0.4,
            "reactionMs": 16.0,
            "socialContactMin": 15.0,
        },
    },
    {
        "id": "CREW-03",
        "name": "Aiko Sato",
        "role": "Medical officer",
        "baselines": {
            "restingHr": 52.0,
            "hrv": 75.0,
            "sbp": 110.0,
            "dbp": 70.0,
            "spo2": 98.6,
            "coreTemp": 36.5,
            "respRate": 13.0,
            "sleepHours": 7.5,
            "sleepEff": 91.0,
            "exerciseMin": 65.0,
            "resistanceLoad": 80.0,
            "gripKg": 32.0,
            "boneMarker": 18.0,
            "mood": 4.2,
            "fatigue": 1.8,
            "stress": 1.8,
            "reactionMs": 255.0,
            "socialContactMin": 105.0,
        },
        "spreads": {
            "restingHr": 2.0,
            "hrv": 5.0,
            "sbp": 3.8,
            "dbp": 2.8,
            "spo2": 0.5,
            "coreTemp": 0.11,
            "respRate": 0.9,
            "sleepHours": 0.35,
            "sleepEff": 2.8,
            "exerciseMin": 6.0,
            "resistanceLoad": 4.5,
            "gripKg": 1.2,
            "boneMarker": 1.8,
            "mood": 0.3,
            "fatigue": 0.35,
            "stress": 0.35,
            "reactionMs": 12.0,
            "socialContactMin": 18.0,
        },
    },
]

# Validation clipping bounds (Section 13.3)
BOUNDS = {
    "restingHr": (25.0, 250.0),
    "hrv": (1.0, 300.0),
    "sbp": (60.0, 260.0),
    "dbp": (30.0, 160.0),
    "spo2": (50.0, 100.0),
    "coreTemp": (30.0, 43.0),
    "respRate": (4.0, 60.0),
    "sleepHours": (0.0, 16.0),
    "sleepEff": (0.0, 100.0),
    "exerciseMin": (0.0, 600.0),
    "resistanceLoad": (0.0, 100.0),
    "gripKg": (0.0, 120.0),
    "boneMarker": (0.0, 100.0),
    "mood": (1.0, 5.0),
    "fatigue": (1.0, 5.0),
    "stress": (1.0, 5.0),
    "reactionMs": (100.0, 2000.0),
    "doseMsv": (0.0, 200.0),
    "cabinCo2": (300.0, 20000.0),
    "cabinTemp": (5.0, 45.0),
    "cabinRh": (0.0, 100.0),
}


class Simulator:
    def __init__(self, seed: int = DEFAULT_SEED, scenarios_path: Optional[str] = None):
        self.seed = seed
        self.rng = np.random.default_rng(seed)
        self.scenarios_config = self._load_scenarios(scenarios_path)
        self.injected_events: List[Dict[str, Any]] = []

    def _load_scenarios(self, path: Optional[str]) -> Dict[str, Any]:
        if path and Path(path).exists():
            with open(path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f).get("scenarios", {})
        # Fallback to embedded scenarios if file not provided
        default_yaml = Path(__file__).parent / "scenarios.yaml"
        if default_yaml.exists():
            with open(default_yaml, "r", encoding="utf-8") as f:
                return yaml.safe_load(f).get("scenarios", {})
        return {}

    def get_default_storyline_events(self) -> List[Dict[str, Any]]:
        """Section 7.7 default scripted events over the 200-day mission."""
        return [
            {
                "id": "EVT-DEFAULT-01",
                "type": "infection",
                "crewIds": ["CREW-02"],
                "startDay": 47,
                "endDay": 57,
                "durationDays": 11,
                "intensity": 0.85,
                "source": "scenario",
                "magnitude": "Moderate",
            },
            {
                "id": "EVT-DEFAULT-02",
                "type": "solar_particle_event",
                "crewIds": ["CREW-01", "CREW-02", "CREW-03"],
                "startDay": 100,
                "endDay": 102,
                "durationDays": 3,
                "intensity": 1.0,
                "source": "donki",
                "magnitude": "S3-Strong",
            },
            {
                "id": "EVT-DEFAULT-03",
                "type": "sleep_disruption",
                "crewIds": ["CREW-01"],
                "startDay": 112,
                "endDay": 124,
                "durationDays": 13,
                "intensity": 0.8,
                "source": "scenario",
                "magnitude": "Moderate",
            },
            {
                "id": "EVT-DEFAULT-04",
                "type": "exercise_decline",
                "crewIds": ["CREW-03"],
                "startDay": 125,
                "endDay": 200,
                "durationDays": 76,
                "intensity": 0.75,
                "source": "scenario",
                "magnitude": "Progressive",
            },
            {
                "id": "EVT-DEFAULT-05",
                "type": "isolation_mood_downturn",
                "crewIds": ["CREW-01", "CREW-02", "CREW-03"],
                "startDay": 160,
                "endDay": 200,
                "durationDays": 41,
                "intensity": 0.7,
                "source": "scenario",
                "magnitude": "Cumulative",
            },
            {
                "id": "EVT-DEFAULT-06",
                "type": "cabin_co2_rise",
                "crewIds": ["CREW-01", "CREW-02", "CREW-03"],
                "startDay": 175,
                "endDay": 180,
                "durationDays": 6,
                "intensity": 0.8,
                "source": "scenario",
                "magnitude": "LifeSupportECLSS",
            },
        ]

    def inject_event(
        self,
        event_type: str,
        crew_ids: List[str],
        start_day: int,
        duration_days: int,
        intensity: float = 0.8,
    ) -> Dict[str, Any]:
        """Injects a custom scenario event into the mission simulation."""
        evt_id = f"EVT-INJ-{len(self.injected_events) + 1:03d}"
        event = {
            "id": evt_id,
            "type": event_type,
            "crewIds": crew_ids,
            "startDay": start_day,
            "endDay": start_day + duration_days - 1,
            "durationDays": duration_days,
            "intensity": max(0.1, min(1.0, intensity)),
            "source": "injected",
            "magnitude": f"Intensity {intensity:.2f}",
        }
        self.injected_events.append(event)
        return event

    def reset_injections(self) -> None:
        """Clears all dynamically injected events, reverting to the default storyline."""
        self.injected_events = []

    def generate_mission(
        self,
        days: int = TOTAL_DAYS,
        include_default_events: bool = True,
        extra_events: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Generates all 200 days of mission readings for all 3 crew members."""
        # Re-initialize RNG with fixed seed for reproducibility
        rng = np.random.default_rng(self.seed)

        events: List[Dict[str, Any]] = []
        if include_default_events:
            events.extend(self.get_default_storyline_events())
        events.extend(self.injected_events)
        if extra_events:
            events.extend(extra_events)

        start_dt = datetime.fromisoformat(START_DATE)

        readings: List[Dict[str, Any]] = []

        # Ambient spacecraft cabin environmental parameters
        cabin_co2_base = 650.0
        cabin_temp_base = 21.5
        cabin_rh_base = 45.0

        for crew in CREW_PROFILES:
            crew_id = crew["id"]
            baselines = crew["baselines"]
            spreads = crew["spreads"]

            # Initialize AR(1) state with baseline values
            state = {k: baselines[k] for k in baselines}
            phi = 0.65  # Autoregressive day-to-day persistence

            for day in range(1, days + 1):
                cur_date = (start_dt + timedelta(days=day - 1)).strftime("%Y-%m-%d")

                # Compute active event effects for this crew member on this day
                effects_delta: Dict[str, float] = {k: 0.0 for k in baselines}
                active_symptoms: List[str] = []
                daily_dose = BASELINE_DOSE_RATE + rng.normal(0, 0.04)

                # Cabin base for the day
                cabin_co2 = cabin_co2_base + rng.normal(0, 20.0)
                cabin_temp = cabin_temp_base + rng.normal(0, 0.3)
                cabin_rh = cabin_rh_base + rng.normal(0, 1.2)

                for evt in events:
                    if day >= evt["startDay"] and day <= evt["endDay"]:
                        if crew_id in evt.get("crewIds", []):
                            e_type = evt["type"]
                            intensity = evt.get("intensity", 0.8)
                            sc_def = self.scenarios_config.get(e_type, {})
                            sc_effects = sc_def.get("effects", {})

                            # Apply specific scenario effects
                            for ind, eff_val in sc_effects.items():
                                if ind == "symptoms":
                                    for sym in eff_val:
                                        if sym not in active_symptoms:
                                            active_symptoms.append(sym)
                                elif ind == "doseMsv":
                                    daily_dose += eff_val * intensity
                                elif ind == "cabinCo2":
                                    cabin_co2 += eff_val * intensity
                                elif ind in effects_delta:
                                    # Extra scaling for isolation downturn on Aiko (CREW-03)
                                    factor = (
                                        1.35
                                        if e_type == "isolation_mood_downturn"
                                        and crew_id == "CREW-03"
                                        else 1.0
                                    )
                                    effects_delta[ind] += eff_val * intensity * factor

                # Update each indicator via AR(1) process:
                # x_t = mu + phi * (x_{t-1} - mu) + epsilon_t + sum e_k(t)
                day_indicators: Dict[str, Any] = {}
                for k, mu in baselines.items():
                    sigma = spreads[k]
                    prev = state[k]
                    noise = rng.normal(0, sigma * math.sqrt(1 - phi**2))
                    val = mu + phi * (prev - mu) + noise + effects_delta[k]

                    # Clamp to bounds
                    if k in BOUNDS:
                        min_v, max_v = BOUNDS[k]
                        val = max(min_v, min(max_v, val))

                    state[k] = val
                    day_indicators[k] = val

                # Environmental bounds check
                cabin_co2 = max(
                    BOUNDS["cabinCo2"][0], min(BOUNDS["cabinCo2"][1], cabin_co2)
                )
                cabin_temp = max(
                    BOUNDS["cabinTemp"][0], min(BOUNDS["cabinTemp"][1], cabin_temp)
                )
                cabin_rh = max(
                    BOUNDS["cabinRh"][0], min(BOUNDS["cabinRh"][1], cabin_rh)
                )
                daily_dose = max(
                    BOUNDS["doseMsv"][0], min(BOUNDS["doseMsv"][1], daily_dose)
                )

                reading_record = {
                    "id": f"{crew_id}:{day}",
                    "crewId": crew_id,
                    "day": day,
                    "date": cur_date,
                    "restingHr": round(float(day_indicators["restingHr"]), 1),
                    "hrv": round(float(day_indicators["hrv"]), 1),
                    "sbp": round(float(day_indicators["sbp"]), 1),
                    "dbp": round(float(day_indicators["dbp"]), 1),
                    "spo2": round(float(day_indicators["spo2"]), 1),
                    "coreTemp": round(float(day_indicators["coreTemp"]), 2),
                    "respRate": round(float(day_indicators["respRate"]), 1),
                    "sleepHours": round(float(day_indicators["sleepHours"]), 2),
                    "sleepEff": round(float(day_indicators["sleepEff"]), 1),
                    "exerciseMin": round(float(day_indicators["exerciseMin"]), 1),
                    "resistanceLoad": round(float(day_indicators["resistanceLoad"]), 1),
                    "gripKg": round(float(day_indicators["gripKg"]), 1),
                    "boneMarker": round(float(day_indicators["boneMarker"]), 1),
                    "mood": round(float(day_indicators["mood"]), 2),
                    "fatigue": round(float(day_indicators["fatigue"]), 2),
                    "stress": round(float(day_indicators["stress"]), 2),
                    "reactionMs": round(float(day_indicators["reactionMs"]), 1),
                    "symptoms": active_symptoms,
                    "doseMsv": round(float(daily_dose), 3),
                    "cabinCo2": round(float(cabin_co2), 1),
                    "cabinTemp": round(float(cabin_temp), 2),
                    "cabinRh": round(float(cabin_rh), 1),
                }
                readings.append(reading_record)

        config_data = {
            "seed": self.seed,
            "totalDays": days,
            "startDate": START_DATE,
            "defaultOneWayDelaySec": 720,  # 12 minutes
            "timeCompression": 60,
            "careerLimitMsv": MAX_CAREER_DOSE_LIMIT,
            "generatedAt": f"{START_DATE}T00:00:00Z",
        }

        return {
            "config": config_data,
            "crew": CREW_PROFILES,
            "events": events,
            "readings": readings,
        }

    def export_static_assets(self, target_dir: str) -> None:
        """Exports mission.json, events.json and config.json to static assets directory."""
        data = self.generate_mission()
        out = Path(target_dir)
        out.mkdir(parents=True, exist_ok=True)

        with open(out / "config.json", "w", encoding="utf-8") as f:
            json.dump(data["config"], f, indent=2)

        with open(out / "events.json", "w", encoding="utf-8") as f:
            json.dump(data["events"], f, indent=2)

        with open(out / "mission.json", "w", encoding="utf-8") as f:
            json.dump(data["readings"], f, indent=2)


if __name__ == "__main__":
    sim = Simulator()
    data = sim.generate_mission()
    print(f"Generated {len(data['readings'])} readings across 3 crew members.")
