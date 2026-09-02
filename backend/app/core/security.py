from __future__ import annotations

import hmac
from typing import Annotated, Optional
from urllib.parse import urlparse

from fastapi import Header, HTTPException, Request, status

from app.core.config import settings


def _error(code: str, message: str, retryable: bool = False) -> dict:
    return {"code": code, "message": message, "retryable": retryable}


async def require_worker_auth(
    authorization: Annotated[Optional[str], Header()] = None,
) -> None:
    expected = f"Bearer {settings.AUTOPOST_WORKER_TOKEN}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_error("unauthorized", "Valid worker authentication is required."),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def reject_tenant_override(request: Request) -> None:
    if "company_id" in request.query_params:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=_error("tenant_override_rejected", "company_id is managed by the worker."),
        )


async def require_mutations_enabled(
    idempotency_key: Annotated[Optional[str], Header(alias="Idempotency-Key")] = None,
) -> None:
    if not settings.AUTOPOST_MUTATIONS_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_error("mutations_disabled", "Worker mutations are disabled.", True),
        )
    if not idempotency_key or len(idempotency_key) < 16 or len(idempotency_key) > 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_error("invalid_idempotency_key", "A valid Idempotency-Key is required."),
        )


def require_allowed_image_url(value: str) -> str:
    parsed = urlparse(value)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or not host or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=_error("invalid_image_url", "The image URL must use HTTPS."),
        )
    if not any(host == allowed or (allowed.startswith(".") and host.endswith(allowed)) for allowed in settings.allowed_image_hosts):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=_error("image_host_not_allowed", "The image host is not allowed."),
        )
    return value
