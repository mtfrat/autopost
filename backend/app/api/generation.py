from fastapi import APIRouter, HTTPException, status
from app.schemas.domain import ManualGenerateRequest
from app.services.database import DatabaseService
from app.services.llm_engine import LLMEngine
from app.services.media_engine import MediaEngine

router = APIRouter(prefix="/api/v1/generate", tags=["Generation"])

@router.post("/manual", status_code=status.HTTP_201_CREATED)
async def generate_manual(request: ManualGenerateRequest):
    db_service = DatabaseService()
    llm_service = LLMEngine()
    media_service = MediaEngine()

    try:
        # 1. Get brand voice and defaults for the company
        company = await db_service.get_company_voice(request.company_id)
        brand_voice = company.get("brand_voice_guidelines", "")
        db_brand_colors = company.get("brand_colors", None)
        db_visual_style = company.get("visual_style_guidelines", None)

        # Merge database configurations with user-provided overrides
        brand_colors = request.brand_colors if request.brand_colors is not None else db_brand_colors
        visual_style = request.visual_style_guidelines if request.visual_style_guidelines is not None else db_visual_style
        tone_modifier = request.tone_modifier # Can be None if not provided

        created_assets = []
        # Generate post for each platform requested
        for platform in request.platforms:
            # 2. Generate text and image prompt with Gemini
            generated_output = await llm_service.generate_b2b_post(
                topic_context=request.topic,
                platform=platform,
                brand_voice=brand_voice,
                brand_colors=brand_colors,
                visual_style_guidelines=visual_style,
                tone_modifier=tone_modifier,
                visual_format=request.visual_format
            )

            # 3. Generate visual asset with Replicate using the visual prompt from Gemini
            media_url = None
            should_skip_image = request.skip_image or (request.visual_format == "text_only")
            if not should_skip_image and generated_output.image_prompt_idea:
                try:
                    media_url = await media_service.generate_corporate_image(
                        generated_output.image_prompt_idea,
                        brand_colors=brand_colors,
                        visual_style_guidelines=visual_style,
                        model_name=request.image_model or "black-forest-labs/flux-schnell"
                    )
                except Exception as img_err:
                    # Log error, but allow request to succeed since text was successfully generated
                    print(f"Warning: Image generation failed for {platform}: {img_err}")

            # 4. Save generated content in 'draft' status
            asset = await db_service.insert_generated_asset(
                company_id=request.company_id,
                platform=platform,
                text=generated_output.post_content,
                media_url=media_url
            )
            created_assets.append(asset)

        return created_assets

    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Generation process failed: {str(err)}")

@router.get("/drafts")
async def get_drafts(company_id: str = None):
    db_service = DatabaseService()
    try:
        drafts = await db_service.get_draft_assets(company_id)
        return drafts
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch drafts: {str(err)}")

@router.patch("/assets/{asset_id}/status")
async def update_status(asset_id: str, payload: dict):
    new_status = payload.get("status")
    if new_status not in ["approved", "rejected", "draft"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status value. Must be 'approved', 'rejected', or 'draft'.")
    
    db_service = DatabaseService()
    try:
        updated_asset = await db_service.update_asset_status(asset_id, new_status)
        return updated_asset
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update asset status: {str(err)}")

