import requests
import json

url = "https://autopost-4rsm.onrender.com/api/v1/generate/overlay"
payload = {
    "company_id": "00000000-0000-0000-0000-000000000000",
    "topic": "Test overlay",
    "base_image_url": "https://ebdvtndvjqtqfhxmhnub.supabase.co/storage/v1/object/public/brand-assets/Gemini_Generated_Image_26sde326sde326sd.png",
    "platforms": ["instagram"]
}

r = requests.post(url, json=payload, timeout=120)
print(f"Status: {r.status_code}")
print(f"Response: {r.text}")
