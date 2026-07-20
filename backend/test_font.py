from PIL import ImageFont
try:
    f = ImageFont.truetype(r"app\assets\fonts\Geist-Bold.ttf", 72)
    print("OK:", f.getname())
except Exception as e:
    print("FAIL:", e)
    # Check if file is actually a font or HTML
    with open(r"app\assets\fonts\Geist-Bold.ttf", "rb") as fh:
        header = fh.read(20)
        print("File header bytes:", header)
        print("Looks like HTML?", b"<" in header or b"html" in header.lower())
