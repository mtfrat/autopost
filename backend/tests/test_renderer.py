import io
import hashlib
import os
import unittest
from unittest.mock import patch

from PIL import Image

from test_security import RENDER_PAYLOAD
from app.schemas.domain import RenderDocumentRequest, RenderOverlayRequest
from app.api.render import _document_request_hash
from app.services.image_editor import FORMATS, ImageEditorService

SAFE_ZONES = {
    "instagram_portrait": {"x": 80, "y": 250, "width": 920, "height": 720},
    "instagram_reel_cover": {"x": 90, "y": 360, "width": 900, "height": 1050},
    "linkedin_square": {"x": 80, "y": 210, "width": 920, "height": 560},
    "linkedin_horizontal": {"x": 88, "y": 180, "width": 820, "height": 300},
    "x_horizontal": {"x": 112, "y": 260, "width": 1080, "height": 410},
}


class RendererTests(unittest.TestCase):
    def test_editorial_formats_are_exact_and_deterministic(self):
        editor = ImageEditorService()
        for output_format, dimensions in FORMATS.items():
            is_reel_cover = output_format == "instagram_reel_cover"
            payload = RenderOverlayRequest.model_validate({
                **RENDER_PAYLOAD,
                "output_format": output_format,
                "safe_zone": SAFE_ZONES[output_format],
                "output_mime": "image/jpeg" if is_reel_cover else "image/png",
                "output_path": "campaign/reel-cover.jpg" if is_reel_cover else "campaign/test.png",
                "text_color": "#FFF7ED" if is_reel_cover else "#181410",
            })
            first = editor.render(payload)
            second = editor.render(payload)
            self.assertEqual(first, second)
            self.assertEqual(Image.open(io.BytesIO(first)).size, dimensions)

    def test_unreadable_title_is_rejected(self):
        editor = ImageEditorService()
        payload = RenderOverlayRequest.model_validate({
            **RENDER_PAYLOAD,
            "headline": "x" * 120,
            "safe_zone": {"x": 80, "y": 250, "width": 200, "height": 120},
            "min_font_size": 80,
            "max_font_size": 80,
        })
        with self.assertRaisesRegex(ValueError, "headline_does_not_fit"):
            editor.render(payload)

    def test_instagram_output_is_a_real_jpeg(self):
        editor = ImageEditorService()
        payload = RenderOverlayRequest.model_validate({**RENDER_PAYLOAD, "output_path": "campaign/test.jpg", "output_mime": "image/jpeg"})
        rendered = editor.render(payload)
        image = Image.open(io.BytesIO(rendered))
        self.assertEqual(image.format, "JPEG")
        self.assertEqual(image.size, FORMATS["instagram_portrait"])

    def test_instagram_reel_cover_is_vertical_jpeg(self):
        editor = ImageEditorService()
        payload = RenderOverlayRequest.model_validate({
            **RENDER_PAYLOAD,
            "output_format": "instagram_reel_cover",
            "safe_zone": SAFE_ZONES["instagram_reel_cover"],
            "output_path": "campaign/reel-cover.jpg",
            "output_mime": "image/jpeg",
            "text_color": "#FFF7ED",
        })
        rendered = editor.render(payload)
        image = Image.open(io.BytesIO(rendered))
        self.assertEqual(image.format, "JPEG")
        self.assertEqual(image.size, (1080, 1920))

    def test_carousel_slide_supports_structured_content(self):
        editor = ImageEditorService()
        payload = RenderOverlayRequest.model_validate({
            **RENDER_PAYLOAD,
            "layout": "framework",
            "composition_kind": "carousel_slide",
            "output_path": "campaign/carousel.jpg",
            "output_mime": "image/jpeg",
            "slide_role": "content",
            "eyebrow": "Sistema comercial",
            "headline": "Tres decisiones para ordenar el seguimiento",
            "body": "Un proceso visible reduce olvidos y mejora la coordinación.",
            "bullets": ["Definir responsables", "Registrar el próximo paso"],
            "slide_number": 2,
            "slide_count": 5,
        })
        rendered = editor.render(payload)
        self.assertEqual(Image.open(io.BytesIO(rendered)).size, FORMATS["instagram_portrait"])

    def test_document_contains_all_pages(self):
        editor = ImageEditorService()
        images = []
        for color in ("#7D2935", "#BF5226", "#181410"):
            image = Image.new("RGB", (108, 135), color)
            output = io.BytesIO()
            image.save(output, format="JPEG")
            images.append(output.getvalue())
        original = editor._download_bytes
        editor._download_bytes = lambda url: images[int(url.rsplit("/", 1)[-1])]
        try:
            document = editor.render_document([f"https://example.supabase.co/{index}" for index in range(3)])
        finally:
            editor._download_bytes = original
        self.assertTrue(document.startswith(b"%PDF-"))
        self.assertEqual(document.count(b"/Type /Page\n"), 3)

    def test_document_contract_rejects_too_few_pages(self):
        with self.assertRaises(Exception):
            RenderDocumentRequest.model_validate({
                "source_urls": ["https://example.supabase.co/one.jpg"],
                "destination_upload_url": "https://example.supabase.co/out.pdf",
                "output_path": "campaign/out.pdf",
            })

    def test_carousel_contract_requires_complete_slide_metadata(self):
        with self.assertRaises(Exception):
            RenderOverlayRequest.model_validate({
                **RENDER_PAYLOAD,
                "composition_kind": "carousel_slide",
            })

    def test_instagram_carousel_requires_jpeg(self):
        with self.assertRaises(Exception):
            RenderOverlayRequest.model_validate({
                **RENDER_PAYLOAD,
                "composition_kind": "carousel_slide",
                "slide_role": "cover",
                "slide_number": 1,
                "slide_count": 3,
            })

    def test_focal_point_is_forwarded_to_the_crop(self):
        editor = ImageEditorService()
        payload = RenderOverlayRequest.model_validate({
            **RENDER_PAYLOAD,
            "layout": "image_overlay",
            "source_url": "https://example.supabase.co/source.jpg",
            "focal_point": {"x": .2, "y": .8},
            "text_color": "#FFF7ED",
            "overlay_opacity": .72,
        })
        with patch.object(editor, "_download_source", return_value=Image.new("RGBA", FORMATS["instagram_portrait"], "#181410")) as download:
            editor.render(payload)
        self.assertEqual(download.call_args.args[2], (.2, .8))

    def test_four_layouts_have_distinct_compositions(self):
        editor = ImageEditorService()
        base = {**RENDER_PAYLOAD, "body": "Una explicación breve.", "bullets": []}
        image = Image.new("RGB", FORMATS["instagram_portrait"], "#796a5e")
        layouts = {}
        with patch.object(editor, "_download_source", return_value=image.convert("RGBA")):
            for layout in ("editorial", "metric", "framework", "image_overlay"):
                payload = RenderOverlayRequest.model_validate({
                    **base,
                    "layout": layout,
                    "source_url": "https://example.supabase.co/source.jpg" if layout == "image_overlay" else None,
                    "text_color": "#FFF7ED" if layout == "image_overlay" else "#181410",
                    "overlay_opacity": .72 if layout == "image_overlay" else 0,
                    "emphasis": "30%" if layout == "metric" else None,
                    "bullets": ["Definir responsables", "Registrar excepciones"] if layout == "framework" else [],
                })
                layouts[layout] = hashlib.sha256(editor.render(payload)).hexdigest()
        self.assertEqual(len(set(layouts.values())), 4)

    def test_framework_fits_production_linkedin_horizontal_template(self):
        editor = ImageEditorService()
        payload = RenderOverlayRequest.model_validate({
            **RENDER_PAYLOAD,
            "layout": "framework",
            "output_format": "linkedin_horizontal",
            "safe_zone": {"x": 88, "y": 120, "width": 900, "height": 390},
            "headline": "Un sistema visible para ordenar cada seguimiento comercial",
            "eyebrow": "Puna Tech · Operaciones",
            "body": "Un sistema visible permite identificar el estado de cada caso, el próximo paso y el momento de intervenir.",
            "bullets": ["Qué pasó", "Qué sigue", "Cuándo intervenir"],
            "min_font_size": 32,
            "max_font_size": 60,
        })
        rendered = editor.render(payload)
        self.assertEqual(Image.open(io.BytesIO(rendered)).size, FORMATS["linkedin_horizontal"])

    def test_low_contrast_is_rejected(self):
        editor = ImageEditorService()
        payload = RenderOverlayRequest.model_validate({**RENDER_PAYLOAD, "text_color": "#F7EFE2"})
        with self.assertRaisesRegex(ValueError, "insufficient_contrast"):
            editor.render(payload)

    def test_brand_fonts_and_license_are_packaged(self):
        editor = ImageEditorService()
        self.assertTrue(os.path.exists(editor.headline_font_path))
        license_path = os.path.join(os.path.dirname(editor.headline_font_path), "NEWSREADER-LICENSE.txt")
        self.assertTrue(os.path.exists(license_path))

    def test_document_hash_ignores_signed_tokens_but_keeps_page_order(self):
        common = {
            "source_urls": [
                "https://example.supabase.co/a.png?token=one",
                "https://example.supabase.co/b.png?token=two",
                "https://example.supabase.co/c.png?token=three",
            ],
            "destination_upload_url": "https://example.supabase.co/out.pdf?token=upload-one",
            "output_path": "campaign/out.pdf",
        }
        first = RenderDocumentRequest.model_validate(common)
        second = RenderDocumentRequest.model_validate({
            **common,
            "source_urls": [url.replace("token=", "token=new-") for url in common["source_urls"]],
            "destination_upload_url": "https://example.supabase.co/out.pdf?token=upload-two",
        })
        reordered = RenderDocumentRequest.model_validate({**common, "source_urls": list(reversed(common["source_urls"]))})
        self.assertEqual(_document_request_hash(first), _document_request_hash(second))
        self.assertNotEqual(_document_request_hash(first), _document_request_hash(reordered))


if __name__ == "__main__":
    unittest.main()
