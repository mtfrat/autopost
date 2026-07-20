from fastapi import APIRouter, HTTPException, status
from app.schemas.domain import BrandImageCreate
from app.services.database import DatabaseService

router = APIRouter(prefix="/api/v1/brand-library", tags=["Brand Library"])


@router.get("")
async def list_brand_images(company_id: str, category: str = None):
    db = DatabaseService()
    try:
        images = await db.get_brand_images(company_id, category)
        return images
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch brand images: {err}"
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_brand_image(data: BrandImageCreate):
    db = DatabaseService()
    try:
        image = await db.create_brand_image(data.model_dump())
        return image
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add brand image: {err}"
        )


@router.delete("/{image_id}")
async def remove_brand_image(image_id: str):
    db = DatabaseService()
    try:
        await db.delete_brand_image(image_id)
        return {"status": "deleted"}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete brand image: {err}"
        )

@router.get("/templates")
async def list_templates():
    db = DatabaseService()
    db._check_client()
    try:
        # List files in the brand-assets bucket
        files = db.client.storage.from_("brand-assets").list()
        
        urls = []
        for file in files:
            # Skip empty placeholder files sometimes created by Supabase
            if file["name"] == ".emptyFolderPlaceholder":
                continue
            
            public_url = db.client.storage.from_("brand-assets").get_public_url(file["name"])
            urls.append({
                "id": file["id"],
                "name": file["name"],
                "url": public_url
            })
        return urls
    except Exception as err:
        print(f"Warning: Failed to fetch templates: {err}")
        return []
