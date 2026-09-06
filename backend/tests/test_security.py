import os
import unittest

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
os.environ.setdefault("PUNA_COMPANY_ID", "00000000-0000-0000-0000-000000000000")
os.environ.setdefault("AUTOPOST_WORKER_TOKEN", "test-worker-token-with-at-least-32-characters")
os.environ.setdefault("AUTOPOST_SCHEDULER_ENABLED", "false")
os.environ.setdefault("AUTOPOST_MUTATIONS_ENABLED", "false")

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.scheduler.tasks import scheduler
from app.schemas.domain import ManualGenerateRequest, OverlayGenerateRequest, RenderOverlayRequest

RENDER_PAYLOAD = {
    "layout": "editorial", "output_format": "instagram_portrait",
    "destination_upload_url": "https://example.supabase.co/storage/v1/upload/sign/generated-media/test.png?token=signed",
    "output_path": "campaign/test.png", "headline": "Automatizar sin perder control",
    "safe_zone": {"x": 80, "y": 250, "width": 920, "height": 720},
    "text_align": "left", "vertical_align": "center", "overlay_color": "#3B2A1E",
    "overlay_opacity": 0, "text_color": "#181410", "min_font_size": 48,
    "max_font_size": 104, "logo_enabled": True,
}

JPEG_RENDER_PAYLOAD = {**RENDER_PAYLOAD, "destination_upload_url": "https://example.supabase.co/storage/v1/upload/sign/generated-media/test.jpg?token=signed", "output_path": "campaign/test.jpg", "output_mime": "image/jpeg"}


class WorkerSecurityTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.headers = {"Authorization": f"Bearer {os.environ['AUTOPOST_WORKER_TOKEN']}"}

    def tearDown(self):
        self.client.close()

    def test_health_is_public_and_generic(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "service": "puna-content-worker", "version": "1"},
        )

    def test_internal_routes_require_authentication(self):
        self.assertEqual(self.client.get("/api/v1/capabilities").status_code, 401)
        self.assertEqual(
            self.client.get(
                "/api/v1/capabilities",
                headers={"Authorization": "Bearer wrong"},
            ).status_code,
            401,
        )

    def test_capabilities_with_valid_token(self):
        response = self.client.get("/api/v1/capabilities", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["mutations_enabled"])

    def test_mutations_are_disabled(self):
        response = self.client.post(
            "/api/v1/render/overlay",
            headers={**self.headers, "Idempotency-Key": "phase-2-render-test"},
            json=RENDER_PAYLOAD,
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "mutations_disabled")

    def test_company_query_override_is_rejected(self):
        response = self.client.post(
            "/api/v1/render/overlay?company_id=00000000-0000-0000-0000-000000000000",
            headers=self.headers,
            json=RENDER_PAYLOAD,
        )
        self.assertEqual(response.status_code, 422)

    def test_generation_contracts_forbid_legacy_fields(self):
        with self.assertRaises(ValidationError):
            ManualGenerateRequest.model_validate(
                {
                    "topic": "Test",
                    "platforms": ["linkedin"],
                    "company_id": "puna",
                    "image_model": "flux",
                }
            )
        with self.assertRaises(ValidationError):
            RenderOverlayRequest.model_validate({**RENDER_PAYLOAD, "company_id": "puna"})

    def test_instagram_jpeg_contract(self):
        payload = RenderOverlayRequest.model_validate(JPEG_RENDER_PAYLOAD)
        self.assertEqual(payload.output_mime, "image/jpeg")

    def test_old_mutations_are_unmounted(self):
        self.assertEqual(self.client.post("/api/v1/generate/manual", headers=self.headers, json={}).status_code, 404)
        self.assertEqual(self.client.get("/api/v1/profiles", headers=self.headers).status_code, 404)
        self.assertEqual(self.client.get("/api/v1/brand-library", headers=self.headers).status_code, 404)
        with self.assertRaises(ValidationError):
            OverlayGenerateRequest.model_validate(
                {
                    "topic": "Test",
                    "platforms": ["linkedin"],
                    "base_image_url": "http://example.com/image.png",
                }
            )

    def test_docs_and_wildcard_cors_are_disabled(self):
        self.assertEqual(self.client.get("/docs").status_code, 404)
        self.assertEqual(self.client.get("/openapi.json").status_code, 404)
        response = self.client.options(
            "/api/v1/capabilities",
            headers={
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertNotEqual(response.headers.get("access-control-allow-origin"), "*")

    def test_scheduler_is_disabled_by_default(self):
        self.assertFalse(scheduler.running)


if __name__ == "__main__":
    unittest.main()
