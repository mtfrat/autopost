from supabase import create_client, Client
from app.core.config import settings
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

class DatabaseService:
    def __init__(self):
        self.client: Optional[Client] = None
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    def _check_client(self):
        if not self.client:
            raise RuntimeError("Supabase client is not configured.")

    async def get_company_voice(self, company_id: str) -> Dict[str, Any]:
        self._check_client()
        response = self.client.table("tenant_companies").select("*").eq("id", company_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise ValueError(f"Company with ID {company_id} not found in database.")

    async def get_active_configs(self, company_id: Optional[str] = None) -> List[Dict[str, Any]]:
        self._check_client()
        query = self.client.table("platform_configurations").select("*").eq("is_active", True)
        if company_id:
            query = query.eq("company_id", company_id)
        response = query.execute()
        return response.data or []

    async def pop_pending_topic(self, company_id: str) -> Optional[Dict[str, Any]]:
        self._check_client()
        # 1. Select the oldest pending topic
        response = (
            self.client.table("content_backlog")
            .select("*")
            .eq("company_id", company_id)
            .eq("is_consumed", False)
            .order("created_at", desc=False)
            .limit(1)
            .execute()
        )
        if not response.data or len(response.data) == 0:
            return None
        
        topic = response.data[0]
        # 2. Mark it as consumed
        update_response = (
            self.client.table("content_backlog")
            .update({"is_consumed": True})
            .eq("id", topic["id"])
            .eq("company_id", company_id)
            .execute()
        )
        if update_response.data and len(update_response.data) > 0:
            return update_response.data[0]
        return topic

    async def insert_generated_asset(self, company_id: str, platform: str, text: str, media_url: Optional[str]) -> Dict[str, Any]:
        self._check_client()
        response = (
            self.client.table("generated_assets")
            .insert({
                "company_id": company_id,
                "platform_name": platform,
                "generated_text": text,
                "media_url": media_url,
                "approval_status": "draft"
            })
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise RuntimeError("Failed to insert generated asset into Supabase.")

    async def get_draft_assets(self, company_id: str) -> List[Dict[str, Any]]:
        self._check_client()
        query = self.client.table("generated_assets").select("*").eq("approval_status", "draft").eq("company_id", company_id)
        response = query.execute()
        return response.data or []

    async def update_asset_status(self, asset_id: str, status: str, company_id: str) -> Dict[str, Any]:
        self._check_client()
        response = (
            self.client.table("generated_assets")
            .update({"approval_status": status})
            .eq("id", asset_id)
            .eq("company_id", company_id)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise ValueError(f"Asset with ID {asset_id} not found or update failed.")

    async def create_user(self, email: str, company_id: str, full_name: Optional[str] = None) -> Dict[str, Any]:
        self._check_client()
        response = (
            self.client.table("users")
            .insert({
                "email": email,
                "company_id": company_id,
                "full_name": full_name
            })
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise RuntimeError("Failed to create user in database.")

    async def get_users(self) -> List[Dict[str, Any]]:
        self._check_client()
        response = self.client.table("users").select("*").execute()
        return response.data or []

    async def create_template(
        self,
        name: str,
        company_id: str,
        brand_colors: Optional[str],
        visual_style_guidelines: Optional[str],
        tone_modifier: Optional[str],
        platforms: List[str],
        skip_image: bool,
        visual_format: str = "single_image",
        image_model: str = "black-forest-labs/flux-schnell"
    ) -> Dict[str, Any]:
        self._check_client()
        response = (
            self.client.table("generation_templates")
            .insert({
                "name": name,
                "company_id": company_id,
                "brand_colors": brand_colors,
                "visual_style_guidelines": visual_style_guidelines,
                "tone_modifier": tone_modifier,
                "platforms": platforms,
                "skip_image": skip_image,
                "visual_format": visual_format,
                "image_model": image_model
            })
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise RuntimeError("Failed to create template in database.")

    async def get_templates(self, company_id: str) -> List[Dict[str, Any]]:
        self._check_client()
        response = (
            self.client.table("generation_templates")
            .select("*")
            .eq("company_id", company_id)
            .execute()
        )
        return response.data or []

    # ── Brand Image Library ──────────────────────────────────────────────

    async def get_brand_images(self, company_id: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
        self._check_client()
        query = self.client.table("brand_image_library").select("*").eq("company_id", company_id).eq("is_active", True).order("created_at", desc=True)
        if category:
            query = query.eq("category", category)
        response = query.execute()
        return response.data or []

    async def create_brand_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
        self._check_client()
        response = self.client.table("brand_image_library").insert(data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise RuntimeError("Failed to insert brand image into database.")

    async def delete_brand_image(self, image_id: str, company_id: str) -> bool:
        self._check_client()
        self.client.table("brand_image_library").delete().eq("id", image_id).eq("company_id", company_id).execute()
        return True

    async def get_random_brand_image(self, company_id: str, category: Optional[str] = None) -> Optional[Dict[str, Any]]:
        self._check_client()
        query = self.client.table("brand_image_library").select("*").eq("company_id", company_id).eq("is_active", True)
        if category:
            query = query.eq("category", category)
        response = query.execute()
        if response.data and len(response.data) > 0:
            import random
            return random.choice(response.data)
        return None

    # ── Storage ─────────────────────────────────────────────────────────

    async def upload_to_storage(self, bucket: str, filename: str, file_data: bytes, content_type: str = "image/png") -> str:
        self._check_client()
        # Upload the file
        res = self.client.storage.from_(bucket).upload(
            path=filename,
            file=file_data,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        # Get public URL
        public_url = self.client.storage.from_(bucket).get_public_url(filename)
        return public_url

    async def begin_render(self, idempotency_key: str, request_hash: str) -> Dict[str, Any]:
        self._check_client()
        response = self.client.rpc("begin_worker_render", {"target_key": idempotency_key, "target_hash": request_hash}).execute()
        data = response.data
        if isinstance(data, list):
            data = data[0] if data else None
        if not data:
            raise RuntimeError("Failed to create renderer idempotency record.")
        return data

    async def complete_render(self, run_id: str, result: Dict[str, Any]) -> None:
        self._check_client()
        self.client.table("worker_render_runs").update({
            "status": "succeeded", "output_path": result["output_path"], "width": result.get("width"),
            "height": result.get("height"), "page_count": result.get("page_count"), "mime_type": result["mime_type"], "sha256": result["sha256"],
            "error_code": None, "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", run_id).execute()

    async def fail_render(self, run_id: str, error_code: str) -> None:
        self._check_client()
        self.client.table("worker_render_runs").update({"status": "failed", "error_code": error_code, "completed_at": datetime.now(timezone.utc).isoformat()}).eq("id", run_id).execute()
