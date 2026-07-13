import asyncio
import replicate
from app.services.media_engine import MediaEngine

async def main():
    me = MediaEngine()
    res = await me.generate_corporate_image('test prompt', model_name='black-forest-labs/flux-schnell')
    print(f'RESULT: {res}')

if __name__ == "__main__":
    asyncio.run(main())
