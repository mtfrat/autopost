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
    visual_format: Optional[Literal['text_only', 'single_image', 'carousel', 'hybrid']] = 'single_image'
    image_model: Optional[str] = 'black-forest-labs/flux-schnell'

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
    visual_format: Optional[Literal['text_only', 'single_image', 'carousel', 'hybrid']] = 'single_image'
    image_model: Optional[str] = 'black-forest-labs/flux-schnell'

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

# Brand image library schemas
class BrandImageCreate(BaseModel):
    company_id: str
    image_url: str
    category: Literal['use_case_roi', 'technical_education', 'build_in_public', 'thought_leadership', 'cta', 'general']
    title: str
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    prompt_used: Optional[str] = None
    aspect_ratio: str = '1:1'

class BrandImageResponse(BaseModel):
    id: UUID
    company_id: UUID
    image_url: str
    category: str
    title: str
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    prompt_used: Optional[str] = None
    aspect_ratio: str
    is_active: bool
    created_at: datetime

class OverlayGenerateRequest(BaseModel):
    company_id: str
    topic: str
    base_image_url: str
    platforms: list[Literal['linkedin', 'x', 'instagram']] = ['linkedin']
    tone_modifier: Optional[str] = None
