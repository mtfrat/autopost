from supabase import create_client, Client
from app.core.config import settings
from typing import Optional, List, Dict, Any

class DatabaseService:
    def __init__(self):
        self.client: Optional[Client] = None
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            except Exception as e:
                # Log or print warning, will throw on usage if keys are invalid
                print(f"Warning: Failed to initialize Supabase client: {e}")

    def _check_client(self):
        if not self.client:
            raise ValueError("Supabase client is not initialized. Please configure SUPABASE_URL and SUPABASE_KEY in .env.")

    async def get_company_voice(self, company_id: str) -> Dict[str, Any]:
        self._check_client()
        try:
            response = self.client.table("tenant_companies").select("*").eq("id", company_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
        except Exception as e:
            print(f"Warning: Database query failed, using fallback: {e}")
            
        # Safe fallback for the demo / local testing company ID
        if company_id == "00000000-0000-0000-0000-000000000000" or company_id == "puna-tech-uuid":
            return {
                "id": company_id,
                "name": "Puna Tech",
                "industry_vertical": "AI Agents & B2B Automation",
                "brand_voice_guidelines": "Tono B2B profesional, estructurado, enfocado en el ahorro de horas operativas y ROI de tiempo. Máximo 2 emojis.",
                "brand_colors": "Azul cobalto, cian neón y gris oscuro sobre fondo negro",
                "visual_style_guidelines": "Ilustración 3D isométrica minimalista, estética tecnológica y limpia"
            }
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

    async def get_draft_assets(self, company_id: Optional[str] = None) -> List[Dict[str, Any]]:
        self._check_client()
        query = self.client.table("generated_assets").select("*").eq("approval_status", "draft")
        if company_id:
            query = query.eq("company_id", company_id)
        response = query.execute()
        return response.data or []

    async def update_asset_status(self, asset_id: str, status: str) -> Dict[str, Any]:
        self._check_client()
        response = (
            self.client.table("generated_assets")
            .update({"approval_status": status})
            .eq("id", asset_id)
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

