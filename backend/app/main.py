from contextlib import asynccontextmanager
import logging
import re
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.render import router as render_router
from app.core.config import settings
from app.core.security import reject_tenant_override, require_worker_auth
from app.scheduler.tasks import scheduler

logger = logging.getLogger("puna-content-worker")
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_runtime()
    if settings.AUTOPOST_SCHEDULER_ENABLED:
        scheduler.start()
    yield
    if scheduler.running:
        scheduler.shutdown()


app = FastAPI(
    title="Puna Content Worker",
    version="1",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid4()))


def _error_response(request: Request, status_code: int, code: str, message: str, retryable: bool = False):
    request_id = _request_id(request)
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "retryable": retryable,
                "request_id": request_id,
            }
        },
        headers={"X-Request-ID": request_id},
    )


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    supplied = request.headers.get("X-Request-ID", "")
    request.state.request_id = supplied if REQUEST_ID_PATTERN.fullmatch(supplied) else str(uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


@app.exception_handler(HTTPException)
async def handle_http_exception(request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    message = detail.get("message") or (
        str(exc.detail) if exc.status_code < 500 else "The operation could not be completed."
    )
    response = _error_response(
        request,
        exc.status_code,
        detail.get("code", "request_failed"),
        message,
        detail.get("retryable", exc.status_code >= 500),
    )
    for key, value in (exc.headers or {}).items():
        response.headers[key] = value
    return response


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, _exc: RequestValidationError):
    return _error_response(request, 422, "invalid_request", "Request validation failed.")


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception):
    logger.error(
        "worker_request_failed request_id=%s error_type=%s",
        _request_id(request),
        type(exc).__name__,
    )
    return _error_response(
        request,
        500,
        "internal_error",
        "The operation could not be completed.",
        True,
    )


internal_dependencies = [Depends(require_worker_auth), Depends(reject_tenant_override)]
app.include_router(render_router, dependencies=internal_dependencies)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "puna-content-worker", "version": "1"}


@app.get("/api/v1/capabilities", dependencies=internal_dependencies, tags=["Internal"])
async def capabilities():
    return {
        "service": "puna-content-worker",
        "version": "1",
        "mutations_enabled": settings.AUTOPOST_MUTATIONS_ENABLED,
        "capabilities": ["brand_overlay", "carousel_document"],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
