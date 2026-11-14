SEED = 42
BASE_DIR = "data"

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_DIR = PROJECT_ROOT / "data"

RAW_DATA_DIR = DATA_DIR / "raw"

MMASH_PATH = RAW_DATA_DIR / "mmash" / "extracted" / "MMASH" / "DataPaper"