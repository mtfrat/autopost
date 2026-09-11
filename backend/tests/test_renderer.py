import io
import unittest
from unittest.mock import patch

from PIL import Image

from test_security import RENDER_PAYLOAD
from app.schemas.domain import RenderDocumentRequest, RenderOverlayRequest
from app.api.render import _document_request_hash
from app.services.image_editor import FORMATS, ImageEditorService

SAFE_ZONES = {
    "instagram_portrait": {"x": 80, "y": 250, "width": 920, "height": 720},
    "linkedin_square": {"x": 80, "y": 210, "width": 920, "height": 560},
    "linkedin_horizontal": {"x": 88, "y": 180, "width": 820, "height": 300},
    "x_horizontal": {"x": 112, "y": 260, "width": 1080, "height": 410},
}


class RendererTests(unittest.TestCase):
    def test_editorial_formats_are_exact_and_deterministic(self):
        editor = ImageEditorService()
        for output_format, dimensions in FORMATS.items():
            payload = RenderOverlayRequest.model_validate({**RENDER_PAYLOAD, "output_format": output_format, "safe_zone": SAFE_ZONES[output_format]})
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
        })
        with patch.object(editor, "_download_source", return_value=Image.new("RGBA", FORMATS["instagram_portrait"], "#181410")) as download:
            editor.render(payload)
        self.assertEqual(download.call_args.args[2], (.2, .8))

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
