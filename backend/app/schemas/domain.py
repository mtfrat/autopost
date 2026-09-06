from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

Platform = Literal["linkedin", "x", "instagram"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlatformList(StrictModel):
    platforms: list[Platform] = Field(min_length=1, max_length=3)

    @field_validator("platforms")
    @classmethod
    def unique_platforms(cls, value: list[Platform]) -> list[Platform]:
        if len(value) != len(set(value)):
            raise ValueError("platforms must be unique")
        return value


class ManualGenerateRequest(PlatformList):
    topic: str = Field(min_length=1, max_length=300)
    tone_modifier: Optional[str] = Field(default=None, max_length=500)


class OverlayGenerateRequest(PlatformList):
    topic: str = Field(min_length=1, max_length=300)
    base_image_url: HttpUrl
    tone_modifier: Optional[str] = Field(default=None, max_length=500)

    @field_validator("base_image_url")
    @classmethod
    def https_image_url(cls, value: HttpUrl) -> HttpUrl:
        if value.scheme != "https":
            raise ValueError("base_image_url must use HTTPS")
        return value


class AssetStatusUpdate(StrictModel):
    status: Literal["approved", "rejected", "draft"]


class GeneratedAssetResponse(StrictModel):
    id: UUID
    platform_name: Platform
    generated_text: str
    media_url: Optional[str] = None
    approval_status: Literal["draft", "approved", "rejected"]
    scheduled_publish_time: Optional[datetime] = None
    created_at: datetime


class TemplateCreate(PlatformList):
    name: str = Field(min_length=1, max_length=120)
    brand_colors: Optional[str] = Field(default=None, max_length=500)
    visual_style_guidelines: Optional[str] = Field(default=None, max_length=2_000)
    tone_modifier: Optional[str] = Field(default=None, max_length=500)
    skip_image: bool = False
    visual_format: Literal["text_only", "single_image", "overlay"] = "text_only"


class BrandImageCreate(StrictModel):
    image_url: HttpUrl
    category: Literal[
        "use_case_roi",
        "technical_education",
        "build_in_public",
        "thought_leadership",
        "cta",
        "general",
    ]
    title: str = Field(min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=1_000)
    tags: Optional[list[str]] = Field(default=None, max_length=20)
    prompt_used: Optional[str] = Field(default=None, max_length=4_000)
    aspect_ratio: Literal["1:1", "4:5", "16:9"] = "1:1"


class SafeZone(StrictModel):
    x: int = Field(ge=0, le=1600)
    y: int = Field(ge=0, le=1350)
    width: int = Field(ge=200, le=1600)
    height: int = Field(ge=120, le=1350)


class RenderOverlayRequest(StrictModel):
    layout: Literal["editorial", "image_overlay"]
    output_format: Literal["instagram_portrait", "linkedin_square", "linkedin_horizontal", "x_horizontal"]
    source_url: Optional[HttpUrl] = None
    destination_upload_url: HttpUrl
    output_path: str = Field(min_length=1, max_length=500, pattern=r"^[A-Za-z0-9][A-Za-z0-9._/-]*\.(png|jpg|jpeg)$")
    output_mime: Literal["image/png", "image/jpeg"] = "image/png"
    headline: str = Field(min_length=1, max_length=120)
    safe_zone: SafeZone
    text_align: Literal["left", "center"]
    vertical_align: Literal["top", "center", "bottom"]
    overlay_color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    overlay_opacity: float = Field(ge=0, le=1)
    text_color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    min_font_size: int = Field(ge=24, le=160)
    max_font_size: int = Field(ge=24, le=220)
    logo_enabled: bool = True

    @field_validator("source_url", "destination_upload_url")
    @classmethod
    def signed_urls_are_https(cls, value: Optional[HttpUrl]) -> Optional[HttpUrl]:
        if value is not None and value.scheme != "https":
            raise ValueError("signed URLs must use HTTPS")
        return value


class RenderOverlayResponse(StrictModel):
    output_path: str
    width: int
    height: int
    mime_type: Literal["image/png", "image/jpeg"]
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
