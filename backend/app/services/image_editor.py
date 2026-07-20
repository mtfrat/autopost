import io
import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from app.services.database import DatabaseService
import uuid

class ImageEditorService:
    def __init__(self):
        self.font_path = "app/assets/fonts/Geist-Bold.ttf"
        
    async def create_overlay_image(self, base_image_url: str, overlay_text: str) -> bytes:
        """Downloads base image, applies overlay text, returns modified image bytes"""
        # 1. Download image
        response = requests.get(base_image_url)
        response.raise_for_status()
        
        # 2. Open image with PIL
        img = Image.open(io.BytesIO(response.content)).convert("RGBA")
        width, height = img.size
        
        # 3. Create a dark overlay to make text readable
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        # Semi-transparent dark gradient or solid box
        draw.rectangle([0, 0, width, height], fill=(13, 5, 5, 120))  # #0d0505 with alpha
        
        img = Image.alpha_composite(img, overlay)
        
        # 4. Add text
        draw = ImageDraw.Draw(img)
        # Determine font size based on image width (e.g. 8% of width)
        font_size = int(width * 0.08)
        try:
            font = ImageFont.truetype(self.font_path, font_size)
        except IOError:
            # Fallback if font missing
            font = ImageFont.load_default()
            
        # Text wrapping (basic)
        words = overlay_text.upper().split()
        lines = []
        current_line = []
        for word in words:
            current_line.append(word)
            # Check width
            bbox = draw.textbbox((0, 0), " ".join(current_line), font=font)
            if bbox[2] > width * 0.8:
                current_line.pop()
                lines.append(" ".join(current_line))
                current_line = [word]
        if current_line:
            lines.append(" ".join(current_line))
            
        # Draw lines centered
        total_text_height = sum(draw.textbbox((0, 0), line, font=font)[3] for line in lines)
        y = (height - total_text_height) // 2
        
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_width = bbox[2] - bbox[0]
            line_height = bbox[3] - bbox[1]
            x = (width - line_width) // 2
            
            # Draw text with warm cream color (#f8f4f0)
            draw.text((x, y), line, font=font, fill=(248, 244, 240, 255))
            y += line_height + 20 # padding
            
        # 5. Save to bytes
        img = img.convert("RGB") # Remove alpha for saving as JPEG/PNG
        output = io.BytesIO()
        img.save(output, format="PNG")
        return output.getvalue()
        
    async def process_and_upload(self, company_id: str, base_image_url: str, overlay_text: str) -> str:
        """Processes the image and uploads to Supabase generated-media bucket"""
        image_bytes = await self.create_overlay_image(base_image_url, overlay_text)
        
        filename = f"{company_id}/{uuid.uuid4()}.png"
        db = DatabaseService()
        public_url = await db.upload_to_storage("generated-media", filename, image_bytes)
        
        return public_url
