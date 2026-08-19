import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

# In-memory storage for the demo branch
_db_draft_assets = []
_db_templates = []
_db_brand_images = []
_db_users = []
_db_pending_topics = []

class DatabaseService:
    def __init__(self):
        self.client = None
        
    def _check_client(self):
        pass # Mocked

    async def get_company_voice(self, company_id: str) -> Dict[str, Any]:
        return {
            "id": company_id,
            "name": "Puna Tech (Demo)",
            "industry_vertical": "AI Agents & B2B Automation",
            "brand_voice_guidelines": "Tono B2B profesional, estructurado, enfocado en el ahorro de horas operativas y ROI de tiempo. Máximo 2 emojis.",
            "brand_colors": "Terracota cálido (#af4c24), caoba profundo (#6d2c2c) y fondo crema suave (#f8f4f0)",
            "visual_style_guidelines": "Estética cálida y orgánica B2B premium, ilustración 3D minimalista con texturas mate de terracota y cerámica sobre fondo crema limpio"
        }

    async def get_active_configs(self, company_id: Optional[str] = None) -> List[Dict[str, Any]]:
        return []

    async def pop_pending_topic(self, company_id: str) -> Optional[Dict[str, Any]]:
        if _db_pending_topics:
            return _db_pending_topics.pop(0)
        return None

    async def insert_generated_asset(self, company_id: str, platform: str, text: str, media_url: Optional[str]) -> Dict[str, Any]:
        asset = {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "platform_name": platform,
            "generated_text": text,
            "media_url": media_url,
            "approval_status": "draft",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        _db_draft_assets.append(asset)
        return asset

    async def get_draft_assets(self, company_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if company_id:
            return [a for a in _db_draft_assets if a["company_id"] == company_id and a["approval_status"] == "draft"]
        return [a for a in _db_draft_assets if a["approval_status"] == "draft"]

    async def update_asset_status(self, asset_id: str, status: str) -> Dict[str, Any]:
        for a in _db_draft_assets:
            if a["id"] == asset_id:
                a["approval_status"] = status
                return a
        raise ValueError(f"Asset with ID {asset_id} not found.")

    async def create_user(self, email: str, company_id: str, full_name: Optional[str] = None) -> Dict[str, Any]:
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "company_id": company_id,
            "full_name": full_name
        }
        _db_users.append(user)
        return user

    async def get_users(self) -> List[Dict[str, Any]]:
        return _db_users

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
        t = {
            "id": str(uuid.uuid4()),
            "name": name,
            "company_id": company_id,
            "brand_colors": brand_colors,
            "visual_style_guidelines": visual_style_guidelines,
            "tone_modifier": tone_modifier,
            "platforms": platforms,
            "skip_image": skip_image,
            "visual_format": visual_format,
            "image_model": image_model
        }
        _db_templates.append(t)
        return t

    async def get_templates(self, company_id: str) -> List[Dict[str, Any]]:
        return [t for t in _db_templates if t["company_id"] == company_id]

    async def get_brand_images(self, company_id: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
        return [img for img in _db_brand_images if img["company_id"] == company_id]

    async def create_brand_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data["id"] = str(uuid.uuid4())
        _db_brand_images.append(data)
        return data

    async def delete_brand_image(self, image_id: str) -> bool:
        global _db_brand_images
        _db_brand_images = [img for img in _db_brand_images if img["id"] != image_id]
        return True

    async def get_random_brand_image(self, company_id: str, category: Optional[str] = None) -> Optional[Dict[str, Any]]:
        return {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "category": category,
            "image_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1080"
        }

    async def upload_to_storage(self, bucket: str, filename: str, file_data: bytes, content_type: str = "image/png") -> str:
        # Mocking upload, just return a dummy placeholder
        return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1080"
