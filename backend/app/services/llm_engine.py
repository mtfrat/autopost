from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from app.core.config import settings
from typing import Optional

class GeneratedPostOutput(BaseModel):
    post_content: str = Field(
        description="The copy/text of the post generated for the specific social media platform."
    )
    image_prompt_idea: str = Field(
        description="A detailed English image prompt describing a minimalist B2B technology visual for Flux."
    )

class LLMEngine:
    def __init__(self):
        self.client: Optional[genai.Client] = None
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        else:
            # Try initializing with default environment credentials if available
            try:
                self.client = genai.Client()
            except Exception:
                print("Warning: Gemini client could not be initialized. Please set GEMINI_API_KEY.")

    def _check_client(self):
        if not self.client:
            raise ValueError("Gemini API key is missing. Please configure GEMINI_API_KEY in .env.")

    async def generate_b2b_post(
        self, 
        topic_context: str, 
        platform: str, 
        brand_voice: str,
        brand_colors: Optional[str] = None,
        visual_style_guidelines: Optional[str] = None,
        tone_modifier: Optional[str] = None,
        visual_format: Optional[str] = "single_image"
    ) -> GeneratedPostOutput:
        self._check_client()

        # Build robust B2B system instruction
        system_instruction = (
            "Act as the Lead AI Strategist for Puna Tech (puna-tech.com), an enterprise that builds custom AI agents "
            "and autonomous workflows to automate complex back-office B2B processes. Your goal is to write "
            "high-impact content that generates B2B demand by explaining how technology eliminates friction, "
            "saves real working hours, and prevents human errors. Translating complex technical workflows into "
            "clear business value is key.\n\n"
            "Strict Guidelines:\n"
            "1. NO generic marketing boilerplate or empty buzzwords (e.g., 'in the digital age', 'unleash', 'revolutionize'). "
            "Start with direct, punchy hooks.\n"
            "2. Limit emojis to a maximum of 2.\n"
            "3. Focus on quantifying efficiency, reducing manual work, or highlighting B2B integration scenarios.\n"
            "4. Follow the specific guidelines for the platform and format below."
        )

        if tone_modifier:
            system_instruction += f"\n5. Tone Modifier: Ensure the generated post copy strictly follows this tone/style constraint: {tone_modifier}."

        # Platform specific formatting instructions
        platform_instructions = ""
        if platform == "linkedin":
            platform_instructions = (
                "\nPlatform: LINKEDIN\n"
                "- Write a professional, thought-provoking post.\n"
                "- Use short paragraphs and clear line breaks for readability.\n"
                "- Include an implicit or explicit Call to Action (CTA) focusing on calculating time ROI or booking a demo at Puna Tech.\n"
                "- Focus on leadership, business metrics, and workflow orchestration."
            )
        elif platform == "x":
            platform_instructions = (
                "\nPlatform: X (Twitter)\n"
                "- Write a single punchy post or a very short, high-value technical insight.\n"
                "- Must fit within 280 characters if possible, or represent a highly concise, stand-alone hot-take or value nugget.\n"
                "- Be direct, analytical, and slightly informal but highly competent."
            )
        elif platform == "instagram":
            platform_instructions = (
                "\nPlatform: INSTAGRAM\n"
                "- Write structured slide copy for an educational, B2B-focused swipe carousel.\n"
                "- Use clear delimiters like 'Slide 1:', 'Slide 2:', etc. for the slides.\n"
                "- Ensure it is visually structured, easy to read, and educational (e.g., '3 manual tasks you can automate today')."
            )

        # Apply Visual Format overrides
        if visual_format == "carousel":
            platform_instructions += (
                "\nFormat Overrides: SLIDE CAROUSEL\n"
                "- Regardless of the platform defaults, you MUST write the copy structured as slide-by-slide text (e.g., 'Slide 1: [Hook]', 'Slide 2: [Friction]', etc.). Plan for 4 to 6 slides.\n"
                "- AND you MUST design the `image_prompt_idea` to explicitly instruct the image generator to render a clear, modern typography/text overlay on the cover graphic (e.g., with a clean sans-serif text overlay reading: \"AUTOMATIZACIÓN ERP\" or a short 2-3 word B2B key title). Make the text description very precise so that a text-capable model like Flux dev can render it."
            )
        elif visual_format == "text_only":
            platform_instructions += (
                "\nFormat Overrides: TEXT ONLY\n"
                "- The content should be entirely textual. Do not refer to images, slides, or visuals.\n"
                "- Keep the focus purely on reading."
            )
        elif visual_format == "single_image":
            platform_instructions += (
                "\nFormat Overrides: SINGLE IMAGE\n"
                "- The content should be written as a cohesive single post (not slide-by-slide).\n"
                "- The text will be accompanied by a single prominent cover image."
            )

        prompt = (
            f"Brand Voice / Guidelines:\n{brand_voice}\n\n"
            f"Topic / Context for the post:\n{topic_context}\n\n"
            f"{platform_instructions}\n\n"
        )

        if brand_colors:
            prompt += f"Brand Specific Color Palette:\nUse and describe the following specific brand colors: {brand_colors}. Please explicitly incorporate this color palette or descriptions of these colors into the image_prompt_idea.\n\n"

        if visual_style_guidelines:
            prompt += f"Visual Style Guidelines:\nThe generated image_prompt_idea must strictly adhere to the following style: {visual_style_guidelines}.\n\n"

        prompt += "Generate the post content and an English image description for a corporate aesthetic Flux prompt."

        # Robust retry and model fallback mechanism to handle 503 Service Unavailable / high demand
        import asyncio
        import json
        
        models_to_try = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.5-pro']
        last_error = None
        
        for attempt, model_name in enumerate(models_to_try):
            try:
                if attempt > 0:
                    print(f"Retrying generation with fallback model: {model_name} (attempt {attempt + 1})...")
                    await asyncio.sleep(1.5)  # Wait briefly before retry
                
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=GeneratedPostOutput,
                        temperature=0.7
                    )
                )
                
                if response.parsed:
                    return response.parsed
                
                data = json.loads(response.text)
                return GeneratedPostOutput(**data)
            except Exception as e:
                print(f"Error calling model {model_name}: {str(e)}")
                last_error = e
                
        # If all models fail, propagate the exception
        raise last_error
