from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal

class CompanyVoice(BaseModel):
    id: UUID
    name: str
    industry_vertical: Optional[str] = None
    brand_voice_guidelines: Optional[str] = None
    created_at: datetime

class PlatformConfig(BaseModel):
    id: UUID
    company_id: UUID
    platform_name: Literal['linkedin', 'x', 'instagram']
    is_active: bool
    cron_schedule_expr: Optional[str] = None
    tone_modifier: Optional[str] = None
    created_at: datetime

class ContentBacklogItem(BaseModel):
    id: UUID
    company_id: UUID
    source_topic: str
    context_data: Optional[str] = None
    is_consumed: bool
    created_at: datetime

class GeneratedAsset(BaseModel):
    id: UUID
    company_id: UUID
    platform_name: Literal['linkedin', 'x', 'instagram']
    generated_text: str
    media_url: Optional[str] = None
    approval_status: Literal['draft', 'approved', 'rejected']
    scheduled_publish_time: Optional[datetime] = None
    created_at: datetime

# Request schemas
class ManualGenerateRequest(BaseModel):
    company_id: str
    topic: str
    platforms: list[Literal['linkedin', 'x', 'instagram']]
    brand_colors: Optional[str] = None
    visual_style_guidelines: Optional[str] = None
    tone_modifier: Optional[str] = None
    skip_image: Optional[bool] = False
    visual_format: Optional[Literal['text_only', 'single_image', 'carousel']] = 'single_image'
    image_model: Optional[str] = 'black-forest-labs/flux-2-pro'

# User profiles schemas
class UserCreate(BaseModel):
    email: str
    full_name: Optional[str] = None
    company_id: str

class UserResponse(BaseModel):
    id: UUID
    company_id: UUID
    email: str
    full_name: Optional[str] = None
    created_at: datetime

# Preference template schemas
class TemplateCreate(BaseModel):
    name: str
    company_id: str
    brand_colors: Optional[str] = None
    visual_style_guidelines: Optional[str] = None
    tone_modifier: Optional[str] = None
    platforms: list[Literal['linkedin', 'x', 'instagram']]
    skip_image: bool = False
    visual_format: Optional[Literal['text_only', 'single_image', 'carousel']] = 'single_image'
    image_model: Optional[str] = 'black-forest-labs/flux-2-pro'

class TemplateResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    brand_colors: Optional[str] = None
    visual_style_guidelines: Optional[str] = None
    tone_modifier: Optional[str] = None
    platforms: list[Literal['linkedin', 'x', 'instagram']]
    skip_image: bool
    visual_format: str
    image_model: str
    created_at: datetime
