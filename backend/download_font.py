import requests

url = "https://github.com/vercel/geist-font/raw/main/packages/next/fonts/geist-sans/Geist-Bold.ttf"
r = requests.get(url, allow_redirects=True)
print(f"Status: {r.status_code}, Size: {len(r.content)} bytes")
print(f"Header: {r.content[:4]}")

if len(r.content) > 1000 and b"<" not in r.content[:10]:
    with open(r"app\assets\fonts\Geist-Bold.ttf", "wb") as f:
        f.write(r.content)
    print("Font saved!")
    
    # Verify
    from PIL import ImageFont
    font = ImageFont.truetype(r"app\assets\fonts\Geist-Bold.ttf", 120)
    print("Font loaded OK:", font.getname())
else:
    print("ERROR: Downloaded file is not a valid font. Trying Google Fonts fallback...")
    # Fallback: download Inter Bold from Google Fonts
    url2 = "https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Bold.ttf"
    r2 = requests.get(url2, allow_redirects=True)
    print(f"Fallback status: {r2.status_code}, Size: {len(r2.content)} bytes")
    with open(r"app\assets\fonts\Geist-Bold.ttf", "wb") as f:
        f.write(r2.content)
    from PIL import ImageFont
    font = ImageFont.truetype(r"app\assets\fonts\Geist-Bold.ttf", 120)
    print("Fallback font loaded OK:", font.getname())
