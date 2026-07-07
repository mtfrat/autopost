from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.database import DatabaseService
from app.services.llm_engine import LLMEngine
from app.services.media_engine import MediaEngine
import asyncio

scheduler = AsyncIOScheduler()

async def generate_and_save_asset(db_service: DatabaseService, llm_service: LLMEngine, media_service: MediaEngine, company_id: str, platform: str, topic: str):
    try:
        # Get brand voice guidelines
        company = await db_service.get_company_voice(company_id)
        brand_voice = company.get("brand_voice_guidelines", "")

        # Generate post copy and prompt with Gemini
        generated_output = await llm_service.generate_b2b_post(
            topic_context=topic,
            platform=platform,
            brand_voice=brand_voice
        )

        # Generate image using Replicate
        media_url = None
        if generated_output.image_prompt_idea:
            try:
                media_url = await media_service.generate_corporate_image(
                    generated_output.image_prompt_idea
                )
            except Exception as img_err:
                print(f"Warning [Scheduler]: Image generation failed for {platform}: {img_err}")

        # Insert draft asset into database
        await db_service.insert_generated_asset(
            company_id=company_id,
            platform=platform,
            text=generated_output.post_content,
            media_url=media_url
        )
        print(f"Success [Scheduler]: Generated post draft for {platform} on topic: '{topic}'")
    except Exception as e:
        print(f"Error [Scheduler]: Execution failed for company {company_id} on {platform}: {e}")

async def process_automated_content_queue():
    print("Executing automated content queue check...")
    db_service = DatabaseService()
    llm_service = LLMEngine()
    media_service = MediaEngine()

    try:
        # 1. Fetch all active platform configurations
        active_configs = await db_service.get_active_configs()

        # 2. Iterate configurations and check if there are pending backlog items
        for config in active_configs:
            company_id = str(config["company_id"])
            platform = config["platform_name"]

            # Pull the oldest pending topic from the content backlog
            pending_topic = await db_service.pop_pending_topic(company_id)
            if not pending_topic:
                # No pending topics for this tenant, proceed to the next config
                continue

            # Run generation flow in a background task to keep the scheduler loop non-blocking
            asyncio.create_task(
                generate_and_save_asset(
                    db_service, llm_service, media_service,
                    company_id, platform, pending_topic["source_topic"]
                )
            )

    except Exception as e:
        print(f"Error [Scheduler]: Automated queue processing failed: {e}")

# Register the queue processing job to run periodically (e.g., every hour or 5 minutes for demo)
scheduler.add_job(process_automated_content_queue, 'interval', minutes=15, id='automated_content_job')
