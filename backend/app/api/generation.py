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

        import json
        import asyncio

        created_assets = []
        if not request.platforms:
            return []

        # 1. Generate content for the first platform to get the visual prompt(s)
        first_platform = request.platforms[0]
        first_output = await llm_service.generate_b2b_post(
            topic_context=request.topic,
            platform=first_platform,
            brand_voice=brand_voice,
            brand_colors=brand_colors,
            visual_style_guidelines=visual_style,
            tone_modifier=tone_modifier,
            visual_format=request.visual_format
        )

        # 2. Generate the shared visual asset(s)
        shared_media_url = None
        should_skip_image = request.skip_image or (request.visual_format == "text_only")

        if not should_skip_image:
            try:
                # If carousel, generate 3 slide images in parallel
                if request.visual_format == "carousel":
                    prompts_to_use = first_output.carousel_prompts
                    if not prompts_to_use or len(prompts_to_use) < 2:
                        base = first_output.image_prompt_idea or "Corporate B2B presentation slide"
                        prompts_to_use = [
                            f"{base}, Cover slide, bold typography",
                            f"{base}, Diagram slide showing workflow",
                            f"{base}, Final CTA slide with ROI metrics"
                        ]
                        
                    print(f"[API] Generating {len(prompts_to_use)} carousel slide images in parallel using model: {request.image_model}...")
                    tasks = [
                        media_service.generate_corporate_image(
                            prompt,
                            brand_colors=brand_colors,
                            visual_style_guidelines=visual_style,
                            model_name=request.image_model or "black-forest-labs/flux-2-pro"
                        )
                        for prompt in prompts_to_use
                    ]
                    image_urls = await asyncio.gather(*tasks)
                    shared_media_url = json.dumps(image_urls)
                    print(f"[API] Carousel slide images generated successfully: {image_urls}")
                elif first_output.image_prompt_idea:
                    # Single image generation
                    print(f"[API] Generating single cover image using model: {request.image_model}...")
                    shared_media_url = await media_service.generate_corporate_image(
                        first_output.image_prompt_idea,
                        brand_colors=brand_colors,
                        visual_style_guidelines=visual_style,
                        model_name=request.image_model or "black-forest-labs/flux-2-pro"
                    )
            except Exception as img_err:
                print(f"Warning: Shared image generation failed: {img_err}")

        # 3. Save the first generated platform asset in DB
        first_asset = await db_service.insert_generated_asset(
            company_id=request.company_id,
            platform=first_platform,
            text=first_output.post_content,
            media_url=shared_media_url
        )
        created_assets.append(first_asset)

        # 4. Generate text for the remaining platforms in parallel and insert them with the shared media URL
        if len(request.platforms) > 1:
            async def process_remaining(platform):
                out = await llm_service.generate_b2b_post(
                    topic_context=request.topic,
                    platform=platform,
                    brand_voice=brand_voice,
                    brand_colors=brand_colors,
                    visual_style_guidelines=visual_style,
                    tone_modifier=tone_modifier,
                    visual_format=request.visual_format
                )
                asset = await db_service.insert_generated_asset(
                    company_id=request.company_id,
                    platform=platform,
                    text=out.post_content,
                    media_url=shared_media_url
                )
                return asset

            remaining_assets = []
            for plat in request.platforms[1:]:
                asset = await process_remaining(plat)
                remaining_assets.append(asset)
            created_assets.extend(remaining_assets)

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

