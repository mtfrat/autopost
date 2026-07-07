import asyncio
import replicate
from app.core.config import settings
from typing import Optional

class MediaEngine:
    def __init__(self):
        self.token = settings.REPLICATE_API_TOKEN

    def _check_token(self):
        if not self.token:
            raise ValueError("Replicate API token is missing. Please configure REPLICATE_API_TOKEN in .env.")
        import os
        os.environ["REPLICATE_API_TOKEN"] = self.token

    async def generate_corporate_image(
        self, 
        prompt: str, 
        brand_colors: Optional[str] = None, 
        visual_style_guidelines: Optional[str] = None,
        model_name: str = "black-forest-labs/flux-schnell"
    ) -> str:
        self._check_token()
        
        enhanced_prompt = f"{prompt}, high quality corporate B2B tech aesthetic"
        
        if brand_colors:
            enhanced_prompt += f", brand color palette: {brand_colors}"
            
        if visual_style_guidelines:
            enhanced_prompt += f", brand visual style: {visual_style_guidelines}"
        
        # Force lower case check for safety
        model_id = model_name.strip()
        
        def run_model():
            input_params = {
                "prompt": enhanced_prompt
            }
            if "flux" in model_id:
                input_params.update({
                    "aspect_ratio": "1:1",
                    "num_outputs": 1,
                    "output_format": "webp"
                })
            else:
                # Fallback for SDXL or other models
                input_params.update({
                    "scheduler": "K_EULER",
                    "guidance_scale": 7.5,
                    "num_inference_steps": 30
                })

            output = replicate.run(
                model_id,
                input=input_params
            )
            return output

        # Run in thread pool to prevent blocking FastAPI event loop
        output = await asyncio.to_thread(run_model)
        
        if isinstance(output, list) and len(output) > 0:
            return str(output[0])
        elif output:
            # Sometimes it might return a string or iterable
            return str(output)
            
        raise RuntimeError("No image output returned from Replicate FLUX model.")
