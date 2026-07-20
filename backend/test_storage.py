import asyncio
from app.services.database import DatabaseService

async def main():
    db = DatabaseService()
    try:
        files = db.client.storage.from_("brand-assets").list()
        print("FILES:", files)
    except Exception as e:
        print("ERROR:", str(e))

if __name__ == "__main__":
    asyncio.run(main())
