from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, status

from app.core.config import settings
from app.core.security import require_mutations_enabled
from app.schemas.domain import BrandImageCreate
from app.services.database import DatabaseService

router = APIRouter(prefix="/api/v1/brand-library", tags=["Brand Library"])


def _public_image(image: dict) -> dict:
    return {key: value for key, value in image.items() if key != "company_id"}


@router.get("")
async def list_brand_images(category: Optional[str] = None):
    images = await DatabaseService().get_brand_images(settings.PUNA_COMPANY_ID, category)
    return [_public_image(image) for image in images]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_mutations_enabled)],
)
async def add_brand_image(data: BrandImageCreate):
    payload = data.model_dump(mode="json")
    payload["company_id"] = settings.PUNA_COMPANY_ID
    image = await DatabaseService().create_brand_image(payload)
    return _public_image(image)


@router.delete("/{image_id}", dependencies=[Depends(require_mutations_enabled)])
async def remove_brand_image(image_id: str):
    await DatabaseService().delete_brand_image(image_id, settings.PUNA_COMPANY_ID)
    return {"status": "deleted"}


@router.get("/templates")
async def list_templates():
    db = DatabaseService()
    db._check_client()
    files = db.client.storage.from_("brand-assets").list()
    return [
        {
            "id": file.get("id"),
            "name": file["name"],
            "url": db.client.storage.from_("brand-assets").get_public_url(file["name"]),
        }
        for file in files
        if file.get("name") != ".emptyFolderPlaceholder"
    ]
