import io
import unittest

from PIL import Image

from app.schemas.domain import RenderOverlayRequest
from app.services.image_editor import FORMATS, ImageEditorService
from test_security import RENDER_PAYLOAD

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


if __name__ == "__main__":
    unittest.main()
