from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

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


class FocalPoint(StrictModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)


class RenderOverlayRequest(StrictModel):
    layout: Literal["editorial", "image_overlay", "metric", "framework"]
    composition_kind: Literal["single", "carousel_slide"] = "single"
    slide_role: Optional[Literal["cover", "content", "cta"]] = None
    output_format: Literal["instagram_portrait", "linkedin_square", "linkedin_horizontal", "x_horizontal"]
    source_url: Optional[HttpUrl] = None
    destination_upload_url: HttpUrl
    output_path: str = Field(min_length=1, max_length=500, pattern=r"^[A-Za-z0-9][A-Za-z0-9._/-]*\.(png|jpg|jpeg)$")
    output_mime: Literal["image/png", "image/jpeg"] = "image/png"
    headline: str = Field(min_length=1, max_length=120)
    eyebrow: Optional[str] = Field(default=None, max_length=40)
    body: Optional[str] = Field(default=None, max_length=260)
    bullets: list[str] = Field(default_factory=list, max_length=4)
    emphasis: Optional[str] = Field(default=None, max_length=40)
    slide_number: Optional[int] = Field(default=None, ge=1, le=7)
    slide_count: Optional[int] = Field(default=None, ge=3, le=7)
    focal_point: Optional[FocalPoint] = None
    safe_zone: SafeZone
    text_align: Literal["left", "center"]
    vertical_align: Literal["top", "center", "bottom"]
    overlay_color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    overlay_opacity: float = Field(ge=0, le=1)
    text_color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    min_font_size: int = Field(ge=24, le=160)
    max_font_size: int = Field(ge=24, le=220)
    logo_enabled: bool = True

    @field_validator("bullets")
    @classmethod
    def valid_bullets(cls, value: list[str]) -> list[str]:
        if any(not item.strip() or len(item) > 90 for item in value):
            raise ValueError("bullets must contain 1 to 90 characters")
        return value

    @field_validator("slide_role")
    @classmethod
    def slide_role_requires_carousel(cls, value: Optional[str], info):
        if value is not None and info.data.get("composition_kind") != "carousel_slide":
            raise ValueError("slide_role is only valid for carousel slides")
        return value

    @field_validator("source_url", "destination_upload_url")
    @classmethod
    def signed_urls_are_https(cls, value: Optional[HttpUrl]) -> Optional[HttpUrl]:
        if value is not None and value.scheme != "https":
            raise ValueError("signed URLs must use HTTPS")
        return value

    @model_validator(mode="after")
    def valid_composition_contract(self):
        carousel = self.composition_kind == "carousel_slide"
        if carousel and (self.slide_role is None or self.slide_number is None or self.slide_count is None):
            raise ValueError("carousel slides require role, number and count")
        if not carousel and any(value is not None for value in (self.slide_role, self.slide_number, self.slide_count)):
            raise ValueError("slide metadata is only valid for carousel slides")
        if self.slide_number is not None and self.slide_count is not None and self.slide_number > self.slide_count:
            raise ValueError("slide number must not exceed slide count")
        if carousel and self.output_format == "instagram_portrait" and self.output_mime != "image/jpeg":
            raise ValueError("Instagram carousel slides require JPEG")
        if carousel and self.output_format.startswith("linkedin_") and self.output_mime != "image/png":
            raise ValueError("LinkedIn carousel slides require PNG")
        if self.emphasis and self.layout != "metric":
            raise ValueError("emphasis requires metric layout")
        return self


class RenderOverlayResponse(StrictModel):
    output_path: str
    width: int
    height: int
    mime_type: Literal["image/png", "image/jpeg"]
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")


class RenderDocumentRequest(StrictModel):
    source_urls: list[HttpUrl] = Field(min_length=3, max_length=7)
    destination_upload_url: HttpUrl
    output_path: str = Field(min_length=1, max_length=500, pattern=r"^[A-Za-z0-9][A-Za-z0-9._/-]*\.pdf$")

    @field_validator("source_urls", "destination_upload_url")
    @classmethod
    def document_urls_are_https(cls, value):
        values = value if isinstance(value, list) else [value]
        if any(item.scheme != "https" for item in values):
            raise ValueError("signed URLs must use HTTPS")
        if isinstance(value, list) and len({str(item) for item in value}) != len(value):
            raise ValueError("source URLs must be unique")
        return value


class RenderDocumentResponse(StrictModel):
    output_path: str
    mime_type: Literal["application/pdf"]
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    page_count: int = Field(ge=3, le=7)
