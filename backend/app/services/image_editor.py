import io
import os
import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from app.services.database import DatabaseService
import uuid

# Standard Instagram canvas size (4:5 portrait)
CANVAS_WIDTH = 1080
CANVAS_HEIGHT = 1350

class ImageEditorService:
    def __init__(self):
        self.font_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "fonts", "Geist-Bold.ttf")
        
    def _resize_to_canvas(self, img: Image.Image) -> Image.Image:
        """Resize and crop the image to fit the standard Instagram 4:5 canvas."""
        target_ratio = CANVAS_WIDTH / CANVAS_HEIGHT  # 0.8
        img_ratio = img.width / img.height
        
        if img_ratio > target_ratio:
            # Image is wider than target: crop width
            new_height = img.height
            new_width = int(new_height * target_ratio)
            left = (img.width - new_width) // 2
            img = img.crop((left, 0, left + new_width, new_height))
        else:
            # Image is taller than target: crop height
            new_width = img.width
            new_height = int(new_width / target_ratio)
            top = (img.height - new_height) // 2
            img = img.crop((0, top, new_width, top + new_height))
        
        # Resize to exact canvas dimensions
        img = img.resize((CANVAS_WIDTH, CANVAS_HEIGHT), Image.LANCZOS)
        return img

    async def create_overlay_image(self, base_image_url: str, overlay_text: str) -> bytes:
        """Downloads base image, normalizes to Instagram 4:5, applies overlay text, returns modified image bytes"""
        # 1. Download image
        response = requests.get(base_image_url)
        response.raise_for_status()
        
        # 2. Open image and normalize to standard canvas
        img = Image.open(io.BytesIO(response.content)).convert("RGBA")
        img = self._resize_to_canvas(img)
        width, height = img.size  # Always 1080x1350
        
        # 3. Create a dark overlay to make text readable
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        # Semi-transparent dark veil
        draw.rectangle([0, 0, width, height], fill=(13, 5, 5, 100))
        img = Image.alpha_composite(img, overlay)
        
        # 4. Add text — fixed font size since canvas is always 1080px wide
        draw = ImageDraw.Draw(img)
        font_size = 72  # Fixed size optimized for 1080px wide canvas
        try:
            font = ImageFont.truetype(self.font_path, font_size)
        except IOError:
            font = ImageFont.load_default()
            
        # Text wrapping
        words = overlay_text.upper().split()
        lines = []
        current_line = []
        max_text_width = width * 0.75  # Text occupies max 75% of width
        
        for word in words:
            current_line.append(word)
            bbox = draw.textbbox((0, 0), " ".join(current_line), font=font)
            if bbox[2] > max_text_width:
                current_line.pop()
                if current_line:
                    lines.append(" ".join(current_line))
                current_line = [word]
        if current_line:
            lines.append(" ".join(current_line))
            
        # Calculate total text block height
        line_spacing = 16
        line_heights = []
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_heights.append(bbox[3] - bbox[1])
        
        total_text_height = sum(line_heights) + line_spacing * (len(lines) - 1)
        y = (height - total_text_height) // 2
        
        # Draw each line centered
        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font)
            line_width = bbox[2] - bbox[0]
            x = (width - line_width) // 2
            
            # Draw text with warm cream color (#f8f4f0)
            draw.text((x, y), line, font=font, fill=(248, 244, 240, 255))
            y += line_heights[i] + line_spacing
            
        # 5. Save to bytes as PNG
        img = img.convert("RGB")
        output = io.BytesIO()
        img.save(output, format="PNG", quality=95)
        return output.getvalue()
        
    async def process_and_upload(self, company_id: str, base_image_url: str, overlay_text: str) -> str:
        """Processes the image and uploads to Supabase generated-media bucket"""
        image_bytes = await self.create_overlay_image(base_image_url, overlay_text)
        
        filename = f"{company_id}/{uuid.uuid4()}.png"
        db = DatabaseService()
        public_url = await db.upload_to_storage("generated-media", filename, image_bytes)
        
        return public_url
