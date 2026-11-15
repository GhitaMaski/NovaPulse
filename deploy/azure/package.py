"""Build the Azure App Service ZIP from NovaPulse's runtime files."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile, ZipInfo
from zlib import compressobj


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
CHUNK_SIZE = 1024 * 1024


def add_models(archive: ZipFile, root: Path) -> int:
    """Write individually compressed Joblib streams so Oryx keeps them compressed."""
    model_dir = root / "ai_engine" / "models" / "saved_models"
    included = 0
    for name in MODEL_FILES:
        path = model_dir / name
        if not path.is_file():
            continue
        with path.open("rb") as source:
            header = source.read(len(LFS_POINTER_PREFIX))
            if not header or header == LFS_POINTER_PREFIX:
                continue
            if not header.startswith(b"\x80"):
                raise ValueError(f"Expected an uncompressed model file: {path}")
            source.seek(0)
            member = ZipInfo.from_file(path, path.relative_to(root).as_posix())
            member.compress_type = ZIP_STORED
            compressor = compressobj()
            with archive.open(member, "w") as target:
                while chunk := source.read(CHUNK_SIZE):
                    target.write(compressor.compress(chunk))
                target.write(compressor.flush())
            included += 1
    return included


def main():
    deploy_dir = Path(__file__).resolve().parent
    root = deploy_dir.parents[1]
    dist = root / "frontend" / "dist"
    if not (dist / "index.html").is_file():
        raise SystemExit("Run pnpm run build in frontend before packaging the app.")

    web_files = sorted(path for path in (dist / "assets").rglob("*") if path.is_file())
    if not web_files:
        raise SystemExit("The frontend build is missing its assets directory.")

    runtime_files = [
        *sorted((root / "backend").glob("*.py")),
        *sorted((root / "backend" / "app").glob("*.py")),
        root / "backend" / "data" / "donki_snapshot.json",
        root / "ai_engine" / "__init__.py",
        root / "ai_engine" / "models" / "__init__.py",
        root / "ai_engine" / "models" / "predict.py",
        *sorted((root / "sim").glob("*.py")),
        root / "sim" / "scenarios.yaml",
        dist / "index.html",
        *web_files,
    ]

    package = deploy_dir / "novapulse-azure.zip"
    temporary_package = package.with_suffix(".tmp")
    try:
        with ZipFile(temporary_package, "w", compression=ZIP_DEFLATED) as archive:
            archive.write(deploy_dir / "azure_app.py", "azure_app.py")
            archive.write(root / "backend" / "requirements.txt", "requirements.txt")
            for path in runtime_files:
                archive.write(path, path.relative_to(root).as_posix())
            model_count = add_models(archive, root)
            if model_count not in (0, len(MODEL_FILES)):
                raise ValueError(f"Expected {len(MODEL_FILES)} model files, found {model_count}.")
        temporary_package.replace(package)
    finally:
        temporary_package.unlink(missing_ok=True)

    print(f"Ready for Azure App Service: {package} ({model_count} model files)")


if __name__ == "__main__":
    main()
