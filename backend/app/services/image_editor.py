from __future__ import annotations

import hashlib
import io
import os
from typing import Any

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps


FORMATS = {
    "instagram_portrait": (1080, 1350),
    "linkedin_square": (1080, 1080),
    "linkedin_horizontal": (1200, 627),
    "x_horizontal": (1600, 900),
}
MAX_SOURCE_BYTES = 12 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 40_000_000


def _hex_color(value: str) -> tuple[int, int, int]:
    return tuple(int(value[index:index + 2], 16) for index in (1, 3, 5))


class ImageEditorService:
    def __init__(self):
        self.font_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "fonts", "Geist-Bold.ttf")

    def _download_bytes(self, source_url: str) -> bytes:
        response = requests.get(source_url, timeout=15, stream=True, allow_redirects=False)
        response.raise_for_status()
        if int(response.headers.get("content-length", "0") or 0) > MAX_SOURCE_BYTES:
            raise ValueError("source_image_too_large")
        data = bytearray()
        for chunk in response.iter_content(64 * 1024):
            data.extend(chunk)
            if len(data) > MAX_SOURCE_BYTES:
                raise ValueError("source_image_too_large")
        return bytes(data)

    def _download_source(self, source_url: str, size: tuple[int, int], centering: tuple[float, float] = (.5, .5)) -> Image.Image:
        source = Image.open(io.BytesIO(self._download_bytes(source_url)))
        if source.format not in {"JPEG", "PNG", "WEBP"}:
            raise ValueError("invalid_source_image")
        return ImageOps.fit(source.convert("RGB"), size, method=Image.Resampling.LANCZOS, centering=centering).convert("RGBA")

    def _editorial_canvas(self, size: tuple[int, int]) -> Image.Image:
        width, height = size
        image = Image.new("RGBA", size, (247, 239, 226, 255))
        draw = ImageDraw.Draw(image)
        grid = max(28, width // 28)
        for x in range(0, width, grid):
            draw.line((x, 0, x, height), fill=(125, 41, 53, 18), width=1)
        for y in range(0, height, grid):
            draw.line((0, y, width, y), fill=(125, 41, 53, 18), width=1)
        draw.rectangle((0, 0, max(14, width // 90), height), fill=(191, 82, 38, 255))
        return image

    @staticmethod
    def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str] | None:
        words = text.strip().split()
        if not words:
            return None
        lines: list[str] = []
        current = ""
        for word in words:
            if draw.textbbox((0, 0), word, font=font)[2] > max_width:
                return None
            candidate = f"{current} {word}".strip()
            if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
                current = candidate
            else:
                lines.append(current)
                current = word
        lines.append(current)
        return lines

    def _fit_text(self, draw: ImageDraw.ImageDraw, headline: str, zone: dict[str, int], minimum: int, maximum: int):
        for size in range(maximum, minimum - 1, -2):
            font = ImageFont.truetype(self.font_path, size)
            lines = self._wrap(draw, headline, font, zone["width"])
            if not lines:
                continue
            spacing = max(8, int(size * .22))
            boxes = [draw.textbbox((0, 0), line, font=font) for line in lines]
            heights = [box[3] - box[1] for box in boxes]
            total = sum(heights) + spacing * (len(lines) - 1)
            if total <= zone["height"]:
                return font, lines, boxes, total, spacing
        raise ValueError("headline_does_not_fit")

    def _draw_supporting_text(self, draw: ImageDraw.ImageDraw, payload: Any, zone: dict[str, int], start_y: int, color: tuple[int, int, int, int]) -> int:
        blocks = ([payload.body] if payload.body else []) + [f"• {item}" for item in payload.bullets]
        if not blocks:
            return start_y
        font_size = max(24, min(42, payload.min_font_size - 4))
        font = ImageFont.truetype(self.font_path, font_size)
        y = start_y + max(18, font_size // 2)
        for block in blocks:
            lines = self._wrap(draw, block, font, zone["width"])
            if not lines:
                raise ValueError("supporting_text_does_not_fit")
            for line in lines:
                box = draw.textbbox((0, 0), line, font=font)
                line_height = box[3] - box[1]
                if y + line_height > zone["y"] + zone["height"]:
                    raise ValueError("supporting_text_does_not_fit")
                line_width = box[2] - box[0]
                x = zone["x"] if payload.text_align == "left" else zone["x"] + (zone["width"] - line_width) // 2
                draw.text((x, y - box[1]), line, font=font, fill=color)
                y += line_height + max(7, font_size // 5)
            y += max(8, font_size // 4)
        return y

    @staticmethod
    def _draw_mark(draw: ImageDraw.ImageDraw, width: int, height: int, editorial: bool):
        x, y = int(width * .075), int(height * .065)
        unit = max(18, int(width * .022))
        primary = (125, 41, 53, 255) if editorial else (255, 247, 237, 255)
        accent = (255, 107, 0, 255)
        draw.polygon([(x, y + unit), (x + unit, y - unit), (x + 2 * unit, y + unit)], fill=accent)
        draw.polygon([(x + unit, y + unit), (x + 2.5 * unit, y - 2 * unit), (x + 4 * unit, y + unit)], fill=primary)

    def render(self, payload: Any) -> bytes:
        size = FORMATS[payload.output_format]
        width, height = size
        zone = payload.safe_zone.model_dump()
        if zone["x"] + zone["width"] > width or zone["y"] + zone["height"] > height:
            raise ValueError("safe_zone_out_of_bounds")
        if payload.min_font_size > payload.max_font_size:
            raise ValueError("invalid_font_range")

        if payload.layout == "image_overlay":
            if payload.source_url is None:
                raise ValueError("source_image_required")
            focal = payload.focal_point
            centering = (focal.x, focal.y) if focal else (.5, .5)
            image = self._download_source(str(payload.source_url), size, centering)
            overlay = Image.new("RGBA", size, (0, 0, 0, 0))
            ImageDraw.Draw(overlay).rectangle((zone["x"], zone["y"], zone["x"] + zone["width"], zone["y"] + zone["height"]), fill=(*_hex_color(payload.overlay_color), int(payload.overlay_opacity * 255)))
            image = Image.alpha_composite(image, overlay)
        else:
            image = self._editorial_canvas(size)

        draw = ImageDraw.Draw(image)
        color = (*_hex_color(payload.text_color), 255)
        if payload.eyebrow:
            eyebrow_font = ImageFont.truetype(self.font_path, max(22, payload.min_font_size // 2))
            draw.text((zone["x"], zone["y"]), payload.eyebrow.upper(), font=eyebrow_font, fill=color)
            zone = {**zone, "y": zone["y"] + max(46, payload.min_font_size), "height": zone["height"] - max(46, payload.min_font_size)}
        if payload.layout == "metric" and payload.emphasis:
            emphasis_font = ImageFont.truetype(self.font_path, min(220, max(payload.max_font_size, 120)))
            box = draw.textbbox((0, 0), payload.emphasis, font=emphasis_font)
            if box[2] - box[0] > zone["width"]:
                raise ValueError("emphasis_does_not_fit")
            draw.text((zone["x"], zone["y"] - box[1]), payload.emphasis, font=emphasis_font, fill=(191, 82, 38, 255))
            offset = (box[3] - box[1]) + 28
            zone = {**zone, "y": zone["y"] + offset, "height": zone["height"] - offset}
        has_support = bool(payload.body or payload.bullets)
        headline_zone = {**zone, "height": int(zone["height"] * (.48 if has_support else 1))}
        headline_max = min(payload.max_font_size, 82) if has_support else payload.max_font_size
        font, lines, boxes, total_height, spacing = self._fit_text(draw, payload.headline, headline_zone, payload.min_font_size, headline_max)
        y = zone["y"] if has_support or payload.vertical_align == "top" else zone["y"] + zone["height"] - total_height if payload.vertical_align == "bottom" else zone["y"] + (zone["height"] - total_height) // 2
        for line, box in zip(lines, boxes):
            line_width, line_height = box[2] - box[0], box[3] - box[1]
            x = zone["x"] if payload.text_align == "left" else zone["x"] + (zone["width"] - line_width) // 2
            draw.text((x, y - box[1]), line, font=font, fill=color)
            y += line_height + spacing
        self._draw_supporting_text(draw, payload, zone, y, color)
        if payload.composition_kind == "carousel_slide" and payload.slide_number and payload.slide_count:
            counter_font = ImageFont.truetype(self.font_path, max(20, payload.min_font_size // 2))
            counter = f"{payload.slide_number:02d} / {payload.slide_count:02d}"
            box = draw.textbbox((0, 0), counter, font=counter_font)
            draw.text((width - int(width * .075) - (box[2] - box[0]), height - int(height * .065)), counter, font=counter_font, fill=color)
        if payload.logo_enabled:
            self._draw_mark(draw, width, height, payload.layout != "image_overlay")
        output = io.BytesIO()
        if payload.output_mime == "image/jpeg":
            image.convert("RGB").save(output, format="JPEG", quality=92, optimize=True, progressive=True)
        else:
            image.convert("RGB").save(output, format="PNG", optimize=True)
        return output.getvalue()

    @staticmethod
    def upload(destination_url: str, image_bytes: bytes, mime_type: str) -> None:
        response = requests.put(destination_url, data=image_bytes, headers={"Content-Type": mime_type, "x-upsert": "true"}, timeout=20, allow_redirects=False)
        response.raise_for_status()

    async def render_and_upload(self, payload: Any) -> dict[str, Any]:
        image_bytes = self.render(payload)
        self.upload(str(payload.destination_upload_url), image_bytes, payload.output_mime)
        width, height = FORMATS[payload.output_format]
        return {"output_path": payload.output_path, "width": width, "height": height, "mime_type": payload.output_mime, "sha256": hashlib.sha256(image_bytes).hexdigest()}

    def render_document(self, source_urls: list[str]) -> bytes:
        pages: list[Image.Image] = []
        for source_url in source_urls:
            image = Image.open(io.BytesIO(self._download_bytes(source_url)))
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("invalid_source_image")
            pages.append(image.convert("RGB"))
        if not 3 <= len(pages) <= 7:
            raise ValueError("invalid_page_count")
        output = io.BytesIO()
        pages[0].save(output, format="PDF", save_all=True, append_images=pages[1:], resolution=150.0)
        return output.getvalue()

    async def render_and_upload_document(self, payload: Any) -> dict[str, Any]:
        document = self.render_document([str(url) for url in payload.source_urls])
        self.upload(str(payload.destination_upload_url), document, "application/pdf")
        return {"output_path": payload.output_path, "mime_type": "application/pdf", "sha256": hashlib.sha256(document).hexdigest(), "page_count": len(payload.source_urls)}
