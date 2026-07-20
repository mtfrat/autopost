import asyncio
import sys
sys.path.insert(0, '.')
from app.services.image_editor import ImageEditorService

async def test():
    editor = ImageEditorService()
    print(f"Font path: {editor.font_path}")
    
    # Test with a sample image from Supabase
    url = "https://ebdvtndvjqtqfhxmhnub.supabase.co/storage/v1/object/public/brand-assets/Gemini_Generated_Image_26sde326sde326sd.png"
    text = "AHORRO DE TIEMPO"
    
    img_bytes = await editor.create_overlay_image(url, text)
    
    # Save locally to check
    with open("test_output.png", "wb") as f:
        f.write(img_bytes)
    
    print(f"Output size: {len(img_bytes)} bytes")
    print("Saved to test_output.png — check the file!")

asyncio.run(test())
