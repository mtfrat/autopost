import io
import os
import requests
from PIL import Image, ImageDraw, ImageFont
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
        target_ratio = CANVAS_WIDTH / CANVAS_HEIGHT
        img_ratio = img.width / img.height
        
        if img_ratio > target_ratio:
            new_height = img.height
            new_width = int(new_height * target_ratio)
            left = (img.width - new_width) // 2
            img = img.crop((left, 0, left + new_width, new_height))
        else:
            new_width = img.width
            new_height = int(new_width / target_ratio)
            top = (img.height - new_height) // 2
            img = img.crop((0, top, new_width, top + new_height))
        
        img = img.resize((CANVAS_WIDTH, CANVAS_HEIGHT), Image.LANCZOS)
        return img

    async def create_overlay_image(self, base_image_url: str, overlay_text: str) -> bytes:
        """Downloads base image, normalizes to Instagram 4:5, applies large, dynamic overlay text."""
        # 1. Download image
        response = requests.get(base_image_url)
        response.raise_for_status()
        
        # 2. Open image and normalize to standard canvas
        img = Image.open(io.BytesIO(response.content)).convert("RGBA")
        img = self._resize_to_canvas(img)
        width, height = img.size  # Always 1080x1350
        
        # 3. Dark veil for readability
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        draw_overlay = ImageDraw.Draw(overlay)
        draw_overlay.rectangle([0, 0, width, height], fill=(13, 5, 5, 120))
        img = Image.alpha_composite(img, overlay)
        
        # 4. Calculate dynamic font size based on character count & word count
        text_upper = overlay_text.upper().strip()
        num_chars = len(text_upper)
        
        if num_chars <= 15:
            base_font_size = 110
        elif num_chars <= 30:
            base_font_size = 95
        elif num_chars <= 50:
            base_font_size = 80
        else:
            base_font_size = 68
            
        FONT_SIZE = base_font_size
        try:
            font = ImageFont.truetype(self.font_path, FONT_SIZE)
        except IOError:
            print(f"[ImageEditor] WARNING: Could not load font at {self.font_path}, using default")
            font = ImageFont.load_default()
            
        # 5. Word-wrap text
        words = text_upper.split()
        lines = []
        current_line = []
        max_text_width = width * 0.82  # 82% of canvas width
        
        tmp_img = Image.new('RGBA', (1, 1))
        tmp_draw = ImageDraw.Draw(tmp_img)
        
        for word in words:
            current_line.append(word)
            test_line = " ".join(current_line)
            bbox = tmp_draw.textbbox((0, 0), test_line, font=font)
            if bbox[2] - bbox[0] > max_text_width:
                current_line.pop()
                if current_line:
                    lines.append(" ".join(current_line))
                current_line = [word]
        if current_line:
            lines.append(" ".join(current_line))
        
        if not lines:
            lines = [text_upper]
            
        # 6. Calculate line metrics
        line_spacing = int(FONT_SIZE * 0.25)
        line_metrics = []
        for line in lines:
            bbox = tmp_draw.textbbox((0, 0), line, font=font)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            line_metrics.append((w, h))
        
        total_text_height = sum(h for _, h in line_metrics) + line_spacing * (len(lines) - 1)
        
        # 7. Draw text centered on canvas
        draw = ImageDraw.Draw(img)
        y = (height - total_text_height) // 2
        
        shadow_offset = 4
        for i, line in enumerate(lines):
            lw, lh = line_metrics[i]
            x = (width - lw) // 2
            
            # Subtle drop shadow
            draw.text((x + shadow_offset, y + shadow_offset), line, font=font, fill=(0, 0, 0, 200))
            # Main text — warm cream (#f8f4f0)
            draw.text((x, y), line, font=font, fill=(248, 244, 240, 255))
            
            y += lh + line_spacing
            
        # 8. Export as PNG
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
