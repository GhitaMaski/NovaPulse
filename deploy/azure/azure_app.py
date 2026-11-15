"""Public Azure demo with read-only telemetry and stateless predictions."""

from fastapi import Request
from fastapi.responses import JSONResponse

from backend.app.main import app


READ_METHODS = {"get", "head", "options"}
PREDICTION_PATHS = {"/api/v1/predict", "/api/v1/predict/batch"}


def is_public_operation(method, path):
    return method in READ_METHODS or (method == "post" and path in PREDICTION_PATHS)


@app.middleware("http")
async def require_public_operation(request: Request, call_next):
    path = request.url.path
    if not is_public_operation(request.method.lower(), path):
        allowed = "POST, OPTIONS" if path in PREDICTION_PATHS else "GET, HEAD, OPTIONS"
        return JSONResponse(
            {"detail": "This operation is not available in the public demo."},
            status_code=405,
            headers={"Allow": allowed},
        )
    return await call_next(request)


base_openapi = app.openapi


def public_openapi():
    schema = base_openapi()
    paths = {
        path: {method: operation for method, operation in operations.items() if is_public_operation(method, path)}
        for path, operations in schema["paths"].items()
    }
    return {**schema, "paths": {path: operations for path, operations in paths.items() if operations}}


app.openapi = public_openapi
