from fastapi import APIRouter, HTTPException, status
from app.schemas.domain import ManualGenerateRequest, OverlayGenerateRequest
from app.services.database import DatabaseService
from app.services.llm_engine import LLMEngine
from app.services.media_engine import MediaEngine
from app.services.image_editor import ImageEditorService
from datetime import datetime, timezone
import uuid
import asyncio
import json

router = APIRouter(prefix="/api/v1/generate", tags=["Generation"])

def _build_local_asset(company_id: str, platform: str, text: str, media_url) -> dict:
    """Fallback: build an in-memory asset dict when Supabase is unavailable."""
    return {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "platform_name": platform,
        "generated_text": text,
        "media_url": media_url,
        "approval_status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_local": True,  # Flag to skip DB PATCH calls from frontend
    }

async def _generate_images_sequential(
    media_service: MediaEngine,
    prompts: list[str],
    brand_colors,
    visual_style,
    model_name: str,
    delay_between: float = 1.5
) -> list[str]:
    """
    Generate images ONE BY ONE with a small delay between each to respect
    Replicate's burst limit of 5 requests per 5 seconds.
    """
    urls = []
    for i, prompt in enumerate(prompts):
        if i > 0:
            await asyncio.sleep(delay_between)
        url = await media_service.generate_corporate_image(
            prompt,
            brand_colors=brand_colors,
            visual_style_guidelines=visual_style,
            model_name=model_name
        )
        urls.append(url)
        print(f"[API] Slide {i+1}/{len(prompts)} generated: {url[:60]}...")
    return urls

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
        tone_modifier = request.tone_modifier

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
                if request.visual_format == "carousel":
                    prompts_to_use = first_output.carousel_prompts
                    if not prompts_to_use or len(prompts_to_use) < 2:
                        base = first_output.image_prompt_idea or "Corporate B2B presentation slide"
                        prompts_to_use = [
                            f"{base}, Cover slide with bold headline typography",
                            f"{base}, Data visualization or workflow diagram slide",
                            f"{base}, CTA final slide with ROI metrics",
                        ]

                    print(f"[API] Generating {len(prompts_to_use)} carousel slides SEQUENTIALLY "
                          f"(burst-safe) using model: {request.image_model}...")
                    image_urls = await _generate_images_sequential(
                        media_service,
                        prompts=prompts_to_use,
                        brand_colors=brand_colors,
                        visual_style=visual_style,
                        model_name=request.image_model or "black-forest-labs/flux-schnell",
                        delay_between=1.5,
                    )
                    shared_media_url = json.dumps(image_urls)
                    print(f"[API] All {len(image_urls)} carousel images generated successfully.")

                elif request.visual_format == "hybrid":
                    category = first_output.suggested_library_category or "general"
                    print(f"[API] Fetching hybrid image from library for category: {category}...")
                    library_img = await db_service.get_random_brand_image(request.company_id, category)
                    if library_img:
                        shared_media_url = library_img["image_url"]
                        print(f"[API] Hybrid image selected: {shared_media_url[:60]}...")
                    else:
                        print(f"[API] No hybrid image found for category {category}. Falling back to default.")
                        shared_media_url = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600"

                elif first_output.image_prompt_idea:
                    print(f"[API] Generating single image using model: {request.image_model}...")
                    shared_media_url = await media_service.generate_corporate_image(
                        first_output.image_prompt_idea,
                        brand_colors=brand_colors,
                        visual_style_guidelines=visual_style,
                        model_name=request.image_model or "black-forest-labs/flux-schnell"
                    )
                    print(f"[API] Single image generated: {shared_media_url[:60]}...")

            except Exception as img_err:
                print(f"Warning: Image generation failed: {img_err}. Continuing without image.")

        # 3. Save the first generated platform asset in DB (fallback to in-memory if DB unavailable)
        try:
            first_asset = await db_service.insert_generated_asset(
                company_id=request.company_id,
                platform=first_platform,
                text=first_output.post_content,
                media_url=shared_media_url
            )
        except Exception as db_err:
            print(f"Warning: DB insert failed for first asset, using local fallback: {db_err}")
            first_asset = _build_local_asset(
                company_id=request.company_id,
                platform=first_platform,
                text=first_output.post_content,
                media_url=shared_media_url
            )
        created_assets.append(first_asset)

        # 4. Generate text for remaining platforms and assign them the SAME shared image set
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
                try:
                    asset = await db_service.insert_generated_asset(
                        company_id=request.company_id,
                        platform=platform,
                        text=out.post_content,
                        media_url=shared_media_url
                    )
                except Exception as db_err:
                    print(f"Warning: DB insert failed for {platform}, using local fallback: {db_err}")
                    asset = _build_local_asset(
                        company_id=request.company_id,
                        platform=platform,
                        text=out.post_content,
                        media_url=shared_media_url
                    )
                return asset

            for plat in request.platforms[1:]:
                asset = await process_remaining(plat)
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status value.")
    
    db_service = DatabaseService()
    try:
        updated_asset = await db_service.update_asset_status(asset_id, new_status)
        return updated_asset
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update asset status: {str(err)}")

@router.post("/overlay", status_code=status.HTTP_201_CREATED)
async def generate_overlay(request: OverlayGenerateRequest):
    llm = LLMEngine()
    db_service = DatabaseService()
    editor = ImageEditorService()

    try:
        # Get brand voice
        company_profile = await db_service.get_company_voice(request.company_id)
        brand_voice = company_profile.get("brand_voice_guidelines", "Professional B2B.")

        created_assets = []
        
        for platform in request.platforms:
            print(f"[API] Generating overlay post for {platform}...")
            out = await llm.generate_post(
                topic=request.topic,
                platform=platform,
                brand_voice=brand_voice,
                visual_format="overlay",
                tone_modifier=request.tone_modifier
            )
            
            overlay_text = out.overlay_text or "PUNA TECH"
            print(f"[API] Overlay text generated: {overlay_text}")
            
            try:
                final_image_url = await editor.process_and_upload(
                    company_id=request.company_id,
                    base_image_url=request.base_image_url,
                    overlay_text=overlay_text
                )
            except Exception as img_err:
                print(f"[API] Warning: Image overlay failed: {img_err}. Using base image.")
                final_image_url = request.base_image_url
                
            try:
                asset = await db_service.insert_generated_asset(
                    company_id=request.company_id,
                    platform=platform,
                    text=out.post_content,
                    media_url=final_image_url
                )
            except Exception as db_err:
                print(f"[API] DB insert failed, using fallback: {db_err}")
                asset = _build_local_asset(
                    company_id=request.company_id,
                    platform=platform,
                    text=out.post_content,
                    media_url=final_image_url
                )
            created_assets.append(asset)
            
        return created_assets
        
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Overlay generation failed: {str(err)}")
