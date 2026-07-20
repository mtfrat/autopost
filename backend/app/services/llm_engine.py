from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from app.core.config import settings
from typing import Optional
import asyncio
import json

class GeneratedPostOutput(BaseModel):
    post_content: str = Field(
        description="The copy/text of the post generated for the specific social media platform."
    )
    image_prompt_idea: str = Field(
        description="A detailed English image prompt describing a minimalist B2B technology visual for Flux."
    )
    carousel_prompts: Optional[list[str]] = Field(
        default=None,
        description="If visual_format is carousel, provide a list of detailed English image prompts for EACH slide in the carousel."
    )
    suggested_library_category: Optional[str] = Field(
        default=None,
        description="If visual_format is hybrid, suggest a category for the image library: 'use_case_roi', 'technical_education', 'build_in_public', 'thought_leadership', 'cta', or 'general'."
    )
    overlay_text: Optional[str] = Field(
        default=None,
        description="If visual_format is overlay, provide a very short, punchy title (max 5 words) in uppercase to be rendered on top of the image (e.g. 'SISTEMAS AGÉNTICOS')."
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
        visual_format: Optional[str] = "single_image",
        enable_critic: bool = True
    ) -> GeneratedPostOutput:
        self._check_client()

        # Build robust B2B system instruction based on Puna Tech Digital Brand Manual
        system_instruction = (
            "Act as the Lead AI Strategist for Puna Tech (puna-tech.com). "
            "Puna Tech Value Proposition: Puna Tech develops custom AI agentic systems and B2B software solutions to automate complex end-to-end workflows, elevating operational efficiency and scalability.\n"
            "Brand Archetype: The Technical Architect and Strategic Ally.\n"
            "Your goal is to write high-impact content that generates B2B demand by explaining how technology eliminates friction, saves real working hours, and prevents human errors. Translating complex technical workflows into clear business value is key.\n\n"
            "Strict Copywriting & Voice Guidelines:\n"
            "1. NO generic marketing boilerplate or empty buzzwords (e.g., 'in the digital age', 'unleash', 'revolutionize'). Start with direct, punchy hooks.\n"
            "2. Limit emojis to a maximum of 2.\n"
            "3. Content Pillars to rotate: 'Use Cases & ROI' (hard data/financial results), 'Technical Education' (explain complex concepts to CTOs/COOs), 'Build in Public' (share how you solved tech problems), 'Thought Leadership' (future of work, digital transformation).\n"
            "4. Tone of Voice:\n"
            "   - Institutional Voice (Puna Tech): Objective, assertive, dense in information. Short paragraphs, bullet points, one-line sentences for scannability. NO hyperbole. Every claim backed by data/metrics.\n"
            "   - Founders Voice (Julio Lazcano / Ezequiel Estrada): Conversational, reflective, transparent, occasionally contrarian. First-person narrative. Strong hooks challenging the status quo. Focus on learnings/failures without sharing confidential financials.\n"
            "   *Choose the most appropriate voice based on the requested platform and topic context.*\n\n"
            "Visual & Image Generation Guidelines (for `image_prompt_idea` and `carousel_prompts`):\n"
            "1. NO STOCK PHOTOS. ZERO generic images of people smiling at computers. Use ONLY clean icons, UI/workflow diagrams, or abstract B2B minimalist illustrations.\n"
            "2. Colors: Enforce Puna Tech's official brand colors: Warm Terracotta (#af4c24) and Deep Mahogany (#6d2c2c or #2a0e0e) for key elements, on a clean, solid, soft cream (#f8f4f0) background. Absolutely NO dark mode, black backgrounds, neon glows, gradients, or saturated blue/purple colors.\n"
            "3. Visual Style: Strictly specify a clean premium B2B aesthetic with minimalist 3D illustrations, claymorphism, or flat vector icons. Enforce matte textures of terracotta and ceramic.\n"
            "4. NO TEXT OVERLAYS: The generated images MUST NOT contain any text, words, or typography. Provide purely visual concepts (e.g. diagrams, icons, abstract shapes)."
        )

        if tone_modifier:
            system_instruction += f"\n6. Tone Modifier: Ensure the generated post copy strictly follows this tone/style constraint: {tone_modifier}."

        # Platform specific formatting instructions
        platform_instructions = ""
        if platform == "linkedin":
            platform_instructions = (
                "\nPlatform: LINKEDIN (B2B Sales Engine)\n"
                "- Write long-form copy that interleaves unexpected statistics with lessons learned.\n"
                "- Ideal for positioning the founders' authority to decision-makers.\n"
                "- Use short paragraphs and clear line breaks. Focus on leadership and business metrics.\n"
                "- Include an implicit or explicit Call to Action (CTA) focusing on calculating time ROI or booking a demo at Puna Tech."
            )
        elif platform == "x":
            platform_instructions = (
                "\nPlatform: X (Twitter)\n"
                "- Format: Educational threads of 4 to 8 tweets (write as a single connected text, using line breaks or numbering to imply tweets).\n"
                "- The first tweet/sentence MUST contain 80% of the hook's value.\n"
                "- Be direct, analytical, and slightly informal but highly competent.\n"
                "- Focus on being a concise, high-value technical insight or hot-take."
            )
        elif platform == "instagram":
            platform_instructions = (
                "\nPlatform: INSTAGRAM\n"
                "- Copy: Direct to the point, complementing a striking image about technology, workflows, or 'behind the scenes' of the Puna Tech team.\n"
                "- Visuals: High-contrast dark mode graphics acting as quick micro-learnings.\n"
                "- Ensure it is visually structured and easy to read."
            )

        # Apply Visual Format overrides
        if visual_format == "carousel":
            platform_instructions += (
                "\nFormat Overrides: SLIDE CAROUSEL\n"
                "- Regardless of the platform defaults, you MUST write the copy structured as slide-by-slide text (e.g., 'Slide 1: [Hook]', 'Slide 2: [Friction]', etc.). Plan for 4 to 6 slides.\n"
                "- AND you MUST design the `image_prompt_idea` to explicitly instruct the image generator to render a clean, bold, modern typography/text overlay in English on the cover graphic (e.g., a clean sans-serif text overlay reading: \"ERP INTEGRATION\" or \"AI AGENTS\" in all-caps). Do NOT use Spanish or accents.\n"
                "- AND you MUST populate the `carousel_prompts` field with a list of high-quality image prompts, ONE FOR EACH SLIDE generated in the text (e.g. if you wrote 5 slides, you must provide 5 image prompts). Enforce the same typography and Puna Tech colors guidelines for each of these prompts."
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
                "- The content should be written as a cohesive single post (not slide-by-send).\n"
                "- The text will be accompanied by a single prominent cover image."
            )
        elif visual_format == "hybrid":
            platform_instructions += (
                "\nFormat Overrides: HYBRID (IMAGE LIBRARY)\n"
                "- The content should be written as a cohesive single post.\n"
                "- DO NOT describe any specific image prompt in `image_prompt_idea`. Instead, just provide a `suggested_library_category` to fetch a pre-generated image from our brand library."
            )
        elif visual_format == "overlay":
            platform_instructions += (
                "\nFormat Overrides: OVERLAY TEMPLATE\n"
                "- The content should be written as a cohesive single post.\n"
                "- Provide a very short, punchy uppercase title in `overlay_text` (max 5 words) that summarizes the core hook or topic. This text will be rendered directly on top of a pre-selected professional background image."
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
        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash']
        last_error = None
        redactor_output = None
        
        # ── Phase 1: Agente Redactor ── Generate initial draft
        for attempt, model_name in enumerate(models_to_try):
            try:
                if attempt > 0:
                    print(f"[Redactor] Retrying with fallback model: {model_name} (attempt {attempt + 1})...")
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
                    redactor_output = response.parsed
                else:
                    data = json.loads(response.text)
                    redactor_output = GeneratedPostOutput(**data)
                
                print(f"[Redactor] Draft generated successfully with {model_name}.")
                break
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    print(f"[Redactor] Rate limit hit on {model_name}. Waiting 25s to cool down...")
                    await asyncio.sleep(25)
                    try:
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
                            redactor_output = response.parsed
                        else:
                            data = json.loads(response.text)
                            redactor_output = GeneratedPostOutput(**data)
                        print(f"[Redactor] Draft generated successfully with {model_name} after cooldown.")
                        break
                    except Exception as retry_e:
                        print(f"[Redactor] Retry failed after cooldown: {str(retry_e)}")
                        last_error = retry_e
                else:
                    print(f"[Redactor] Error calling model {model_name}: {error_str}")
                    last_error = e
        
        if redactor_output is None:
            raise last_error
        
        # ── Phase 2: Agente Crítico ── Audit and refine the draft
        if not enable_critic:
            return redactor_output
        
        try:
            critic_output = await self._run_critic_agent(redactor_output, platform)
            if critic_output:
                # Restoring carousel_prompts if the critic dropped them to avoid breaking carousels
                redactor_has_prompts = redactor_output.carousel_prompts and len(redactor_output.carousel_prompts) > 0
                critic_dropped_prompts = not critic_output.carousel_prompts or len(critic_output.carousel_prompts) == 0
                if redactor_has_prompts and critic_dropped_prompts:
                    critic_output.carousel_prompts = redactor_output.carousel_prompts
                    print("[Crítico] carousel_prompts restored from Redactor output (critic dropped them).")
                print("[Crítico] Content refined and approved.")
                return critic_output
            else:
                print("[Crítico] Critic returned no output, using Redactor draft as-is.")
                return redactor_output
        except Exception as critic_err:
            # If the critic fails, gracefully fall back to the redactor's output
            print(f"[Crítico] Critic agent failed ({str(critic_err)}). Using Redactor draft as-is.")
            return redactor_output

    async def _run_critic_agent(
        self,
        draft: GeneratedPostOutput,
        platform: str
    ) -> Optional[GeneratedPostOutput]:
        """
        Agente Crítico: Takes the Redactor's draft and audits it for B2B quality.
        Returns a refined GeneratedPostOutput, or None if it cannot improve the draft.
        """
        critic_system_instruction = (
            "You are the Critic Agent for Puna Tech's content pipeline. Your ONLY job is to audit "
            "and refine a draft social media post generated by the Redactor Agent.\n\n"
            "AUDIT RULES (apply ALL of them):\n"
            "1. CLICHÉ DETECTION: Identify and rewrite any corporate marketing clichés. Examples of BANNED phrases:\n"
            "   - 'en la era digital', 'en esta nueva era', 'desbloquear', 'revolucionar', 'transformar tu negocio',\n"
            "     'impulsar el crecimiento', 'soluciones innovadoras', 'de vanguardia', 'sinergia',\n"
            "     'paradigma', 'empoderamiento', 'aprovechar el poder de', 'un mundo cada vez más'.\n"
            "   Replace clichés with concrete, specific language tied to measurable outcomes.\n"
            "2. EMOJI LIMIT: Maximum 2 emojis in the entire post. If there are more, remove the least relevant ones.\n"
            "3. CTA AUDIT: The Call to Action must be specific (e.g., 'Calculá cuántas horas pierde tu equipo' or "
            "'Agendá una auditoría técnica'). Replace any vague CTA like 'Contáctanos' or 'Descubre más'.\n"
            "4. HOOK QUALITY: The first sentence must be a direct, punchy hook. No soft openings.\n"
            "5. PRESERVE STRUCTURE: Keep the same format (slides, paragraphs, etc.) and approximate length.\n"
            "6. IMAGE PROMPTS: Keep both the `image_prompt_idea` and `carousel_prompts` (if present) from the original draft "
            "unchanged, unless they contain obvious errors, Spanish text overlays, or accents (in which case, refine them to use short bold English overlays).\n\n"
            "Return the REFINED version of `post_content`, `image_prompt_idea`, and `carousel_prompts`."
        )

        critic_prompt = (
            f"Platform: {platform.upper()}\n\n"
            f"--- DRAFT FROM REDACTOR AGENT ---\n"
            f"post_content:\n{draft.post_content}\n\n"
            f"image_prompt_idea:\n{draft.image_prompt_idea}\n\n"
            f"carousel_prompts:\n{draft.carousel_prompts}\n\n"
            f"--- END DRAFT ---\n\n"
            "Audit this draft against ALL rules and return the refined version."
        )

        critic_models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash']

        for model_name in critic_models:
            try:
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=critic_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=critic_system_instruction,
                        response_mime_type="application/json",
                        response_schema=GeneratedPostOutput,
                        temperature=0.4  # Lower temperature for more precise editing
                    )
                )

                if response.parsed:
                    return response.parsed

                data = json.loads(response.text)
                return GeneratedPostOutput(**data)
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    print(f"[Crítico] Rate limit hit on {model_name}. Waiting 25s...")
                    await asyncio.sleep(25)
                    try:
                        response = self.client.models.generate_content(
                            model=model_name,
                            contents=critic_prompt,
                            config=types.GenerateContentConfig(
                                system_instruction=critic_system_instruction,
                                response_mime_type="application/json",
                                response_schema=GeneratedPostOutput,
                                temperature=0.4
                            )
                        )
                        if response.parsed:
                            return response.parsed
                        data = json.loads(response.text)
                        return GeneratedPostOutput(**data)
                    except Exception as retry_e:
                        print(f"[Crítico] Retry failed: {str(retry_e)}")
                        continue
                else:
                    print(f"[Crítico] Error with {model_name}: {error_str}")
                    continue

        return None

