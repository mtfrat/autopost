from __future__ import annotations

import hashlib
import json
from typing import Annotated
from urllib.parse import urlsplit, urlunsplit

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.security import require_allowed_image_url, require_mutations_enabled
from app.schemas.domain import RenderDocumentRequest, RenderDocumentResponse, RenderOverlayRequest, RenderOverlayResponse
from app.services.database import DatabaseService
from app.services.image_editor import ImageEditorService


router = APIRouter(prefix="/api/v1/render", tags=["Renderer"])


def _stable_request_hash(payload) -> str:
    value = payload.model_dump(mode="json")
    for field in ("source_url", "destination_upload_url"):
        if value.get(field):
            parsed = urlsplit(value[field])
            value[field] = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _document_request_hash(payload: RenderDocumentRequest) -> str:
    value = payload.model_dump(mode="json")
    value["source_urls"] = [urlunsplit((*urlsplit(url)[:3], "", "")) for url in value["source_urls"]]
    parsed = urlsplit(value["destination_upload_url"])
    value["destination_upload_url"] = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


@router.post("/overlay", response_model=RenderOverlayResponse, dependencies=[Depends(require_mutations_enabled)])
async def render_overlay(
    payload: RenderOverlayRequest,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key")],
):
    require_allowed_image_url(str(payload.destination_upload_url))
    if payload.source_url is not None:
        require_allowed_image_url(str(payload.source_url))
    if payload.layout == "image_overlay" and payload.source_url is None:
        raise HTTPException(status_code=422, detail={"code": "source_image_required", "message": "image_overlay requires source_url."})

    database = DatabaseService()
    try:
        run = await database.begin_render(idempotency_key, _stable_request_hash(payload))
    except Exception as exc:
        raise HTTPException(status_code=409, detail={"code": "idempotency_conflict", "message": "Idempotency key cannot be reused for this request."}) from exc

    if run.get("status") == "succeeded":
        return RenderOverlayResponse(**{key: run[key] for key in ("output_path", "width", "height", "mime_type", "sha256")})
    if not run.get("acquired"):
        raise HTTPException(status_code=409, detail={"code": "render_in_progress", "message": "This render is already in progress.", "retryable": True})

    try:
        result = await ImageEditorService().render_and_upload(payload)
        await database.complete_render(run["id"], result)
        return RenderOverlayResponse(**result)
    except ValueError as exc:
        await database.fail_render(run["id"], str(exc))
        raise HTTPException(status_code=422, detail={"code": str(exc), "message": "The headline or image cannot be composed safely."}) from exc
    except Exception as exc:
        await database.fail_render(run["id"], "render_failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail={"code": "render_failed", "message": "The renderer could not create or upload the image.", "retryable": True}) from exc


@router.post("/document", response_model=RenderDocumentResponse, dependencies=[Depends(require_mutations_enabled)])
async def render_document(payload: RenderDocumentRequest, idempotency_key: Annotated[str, Header(alias="Idempotency-Key")]):
    require_allowed_image_url(str(payload.destination_upload_url))
    for source_url in payload.source_urls:
        require_allowed_image_url(str(source_url))
    database = DatabaseService()
    try:
        run = await database.begin_render(idempotency_key, _document_request_hash(payload))
    except Exception as exc:
        raise HTTPException(status_code=409, detail={"code": "idempotency_conflict", "message": "Idempotency key cannot be reused for this request."}) from exc
    if run.get("status") == "succeeded":
        return RenderDocumentResponse(**{key: run[key] for key in ("output_path", "mime_type", "sha256", "page_count")})
    if not run.get("acquired"):
        raise HTTPException(status_code=409, detail={"code": "render_in_progress", "message": "This render is already in progress.", "retryable": True})
    try:
        result = await ImageEditorService().render_and_upload_document(payload)
        await database.complete_render(run["id"], result)
        return RenderDocumentResponse(**result)
    except ValueError as exc:
        await database.fail_render(run["id"], str(exc))
        raise HTTPException(status_code=422, detail={"code": str(exc), "message": "The document cannot be composed safely."}) from exc
    except Exception as exc:
        await database.fail_render(run["id"], "render_failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail={"code": "render_failed", "message": "The renderer could not create or upload the document.", "retryable": True}) from exc
