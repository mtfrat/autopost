from fastapi import APIRouter, Depends, status

from app.core.config import settings
from app.core.security import require_mutations_enabled
from app.schemas.domain import TemplateCreate
from app.services.database import DatabaseService

router = APIRouter(prefix="/api/v1", tags=["Templates"])


def _public_template(template: dict) -> dict:
    return {key: value for key, value in template.items() if key != "company_id"}


@router.post(
    "/templates",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_mutations_enabled)],
)
async def create_template(payload: TemplateCreate):
    template = await DatabaseService().create_template(
        name=payload.name,
        company_id=settings.PUNA_COMPANY_ID,
        brand_colors=payload.brand_colors,
        visual_style_guidelines=payload.visual_style_guidelines,
        tone_modifier=payload.tone_modifier,
        platforms=payload.platforms,
        skip_image=payload.skip_image,
        visual_format=payload.visual_format,
        image_model="disabled",
    )
    return _public_template(template)


@router.get("/templates")
async def get_templates():
    templates = await DatabaseService().get_templates(settings.PUNA_COMPANY_ID)
    return [_public_template(template) for template in templates]
