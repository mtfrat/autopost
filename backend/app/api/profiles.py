from fastapi import APIRouter, HTTPException, status
from app.schemas.domain import UserCreate, TemplateCreate
from app.services.database import DatabaseService

router = APIRouter(prefix="/api/v1", tags=["Profiles & Templates"])

@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate):
    db = DatabaseService()
    try:
        user = await db.create_user(
            email=payload.email,
            company_id=payload.company_id,
            full_name=payload.full_name
        )
        return user
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create user: {str(e)}")

@router.get("/users")
async def get_users():
    db = DatabaseService()
    try:
        users = await db.get_users()
        return users
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch users: {str(e)}")

@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def create_template(payload: TemplateCreate):
    db = DatabaseService()
    try:
        template = await db.create_template(
            name=payload.name,
            company_id=payload.company_id,
            brand_colors=payload.brand_colors,
            visual_style_guidelines=payload.visual_style_guidelines,
            tone_modifier=payload.tone_modifier,
            platforms=payload.platforms,
            skip_image=payload.skip_image,
            visual_format=payload.visual_format or 'single_image',
            image_model=payload.image_model or 'black-forest-labs/flux-schnell'
        )
        return template
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create template: {str(e)}")

@router.get("/templates")
async def get_templates(company_id: str):
    db = DatabaseService()
    try:
        templates = await db.get_templates(company_id)
        return templates
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch templates: {str(e)}")
