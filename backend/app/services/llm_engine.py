from pydantic import BaseModel, Field
from typing import Optional
import asyncio

class GeneratedPostOutput(BaseModel):
    post_content: str = Field(...)
    image_prompt_idea: str = Field(...)
    carousel_prompts: Optional[list[str]] = Field(default=None)
    suggested_library_category: Optional[str] = Field(default=None)
    overlay_text: Optional[str] = Field(default=None)

class LLMEngine:
    def __init__(self):
        self.client = None

    def _check_client(self):
        pass

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
        
        await asyncio.sleep(1) # Simulate API call delay
        
        platform_text_mock = {
            "linkedin": "🚀 Descubrí cómo la automatización de procesos puede ahorrarte horas de trabajo semanal.\n\nEn Puna Tech, ayudamos a empresas a escalar con sistemas agénticos.\n\n👉 Calculá tu ROI hoy.",
            "x": "La automatización no es el futuro, es el presente.\n\n🧵 Por qué tu empresa necesita agentes IA hoy mismo:\n1. Ahorro de tiempo\n2. Menos errores humanos\n3. Escalabilidad\n\n¿Estás listo?",
            "instagram": "Transformá tu flujo de trabajo con IA. ⚡️\n\nDeslizá para ver cómo en Puna Tech creamos soluciones a medida."
        }
        
        post_content = platform_text_mock.get(platform, "Mocked B2B post content for " + platform)
        
        if tone_modifier:
            post_content += f"\n\n(Tono: {tone_modifier})"
            
        carousel_prompts = None
        if visual_format == "carousel":
            carousel_prompts = [
                "Corporate slide 1, bold typography, warm terracotta",
                "Corporate slide 2, minimalist 3D icon, soft cream background",
                "Corporate slide 3, ROI chart, deep mahogany"
            ]
            post_content = "Slide 1: " + post_content
            
        return GeneratedPostOutput(
            post_content=post_content,
            image_prompt_idea="Minimalist 3D corporate illustration, terracotta and soft cream",
            carousel_prompts=carousel_prompts,
            suggested_library_category="use_case_roi",
            overlay_text="PUNA TECH DEMO"
        )
