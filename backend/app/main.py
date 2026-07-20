from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.generation import router as generation_router
from app.api.profiles import router as profiles_router
from app.api.brand_library import router as brand_library_router
from app.scheduler.tasks import scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting background scheduler...")
    try:
        scheduler.start()
    except Exception as e:
        print(f"Warning: Failed to start scheduler: {e}")
    yield
    # Shutdown
    print("Shutting down background scheduler...")
    try:
        scheduler.shutdown()
    except Exception as e:
        print(f"Warning: Failed to shutdown scheduler: {e}")

app = FastAPI(
    title="Puna Tech Content Engine API",
    description="Automated B2B content generation platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(generation_router)
app.include_router(profiles_router)
app.include_router(brand_library_router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Puna Tech Content Engine"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
