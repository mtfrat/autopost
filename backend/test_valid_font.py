from PIL import ImageFont
import shutil
import os

font_src = r"C:\Users\martin\Documents\Autopost\frontend\node_modules\next\dist\compiled\@vercel\og\Geist-Regular.ttf"
font_dst = r"C:\Users\martin\Documents\Autopost\backend\app\assets\fonts\Geist-Bold.ttf"

try:
    font = ImageFont.truetype(font_src, 120)
    print("SUCCESS: Geist-Regular loaded! Name:", font.getname())
    shutil.copyfile(font_src, font_dst)
    print("Copied valid TTF to Geist-Bold.ttf")
except Exception as e:
    print("FAILED loading Geist-Regular:", e)
