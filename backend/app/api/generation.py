from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.security import require_allowed_image_url, require_mutations_enabled
from app.schemas.domain import (
    AssetStatusUpdate,
    GeneratedAssetResponse,
    ManualGenerateRequest,
    OverlayGenerateRequest,
)
from app.services.database import DatabaseService
from app.services.image_editor import ImageEditorService
from app.services.llm_engine import LLMEngine

router = APIRouter(prefix="/api/v1/generate", tags=["Generation"])


def _public_asset(asset: dict) -> dict:
    return {key: asset.get(key) for key in GeneratedAssetResponse.model_fields}


@router.post(
    "/manual",
    status_code=status.HTTP_201_CREATED,
    response_model=list[GeneratedAssetResponse],
    dependencies=[Depends(require_mutations_enabled)],
)
async def generate_manual(request: ManualGenerateRequest):
    db = DatabaseService()
    llm = LLMEngine()
    company = await db.get_company_voice(settings.PUNA_COMPANY_ID)
    brand_voice = company.get("brand_voice_guidelines", "")
    created_assets = []

    for platform in request.platforms:
        output = await llm.generate_b2b_post(
            topic_context=request.topic,
            platform=platform,
            brand_voice=brand_voice,
            tone_modifier=request.tone_modifier,
            visual_format="text_only",
        )
        asset = await db.insert_generated_asset(
            company_id=settings.PUNA_COMPANY_ID,
            platform=platform,
            text=output.post_content,
            media_url=None,
        )
        created_assets.append(_public_asset(asset))

    return created_assets


@router.get("/drafts", response_model=list[GeneratedAssetResponse])
async def get_drafts():
    drafts = await DatabaseService().get_draft_assets(settings.PUNA_COMPANY_ID)
    return [_public_asset(asset) for asset in drafts]


@router.patch(
    "/assets/{asset_id}/status",
    response_model=GeneratedAssetResponse,
    dependencies=[Depends(require_mutations_enabled)],
)
async def update_status(asset_id: str, payload: AssetStatusUpdate):
    try:
        asset = await DatabaseService().update_asset_status(
            asset_id,
            payload.status,
            settings.PUNA_COMPANY_ID,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "asset_not_found", "message": "Asset not found.", "retryable": False},
        ) from exc
    return _public_asset(asset)


@router.post(
    "/overlay",
    status_code=status.HTTP_201_CREATED,
    response_model=list[GeneratedAssetResponse],
    dependencies=[Depends(require_mutations_enabled)],
)
async def generate_overlay(request: OverlayGenerateRequest):
    base_image_url = require_allowed_image_url(str(request.base_image_url))
    db = DatabaseService()
    llm = LLMEngine()
    editor = ImageEditorService()
    company = await db.get_company_voice(settings.PUNA_COMPANY_ID)
    brand_voice = company.get("brand_voice_guidelines", "Professional B2B.")
    created_assets = []

    for platform in request.platforms:
        output = await llm.generate_b2b_post(
            topic_context=request.topic,
            platform=platform,
            brand_voice=brand_voice,
            visual_format="overlay",
            tone_modifier=request.tone_modifier,
        )
        final_image_url = await editor.process_and_upload(
            company_id=settings.PUNA_COMPANY_ID,
            base_image_url=base_image_url,
            overlay_text=output.overlay_text or "PUNA TECH",
        )
        asset = await db.insert_generated_asset(
            company_id=settings.PUNA_COMPANY_ID,
            platform=platform,
            text=output.post_content,
            media_url=final_image_url,
        )
        created_assets.append(_public_asset(asset))

    return created_assets
