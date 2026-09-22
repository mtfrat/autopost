from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from unittest.mock import patch

from PIL import Image, ImageDraw, ImageOps

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.schemas.domain import RenderOverlayRequest  # noqa: E402
from app.services.image_editor import FORMATS, ImageEditorService  # noqa: E402


OUTPUT = BACKEND.parent / "output" / "launch-matrix"
SOURCE = Path("/Users/martinfraticelli/Documents/punav2-phase7/output/playwright/puna-autopost-product.png")

TEMPLATES = {
    "instagram_portrait": {
        "editorial": ("editorial", {"x": 80, "y": 250, "width": 920, "height": 720}, 48, 104),
        "evidence": ("metric", {"x": 80, "y": 220, "width": 920, "height": 830}, 42, 94),
        "system": ("framework", {"x": 80, "y": 220, "width": 920, "height": 830}, 40, 82),
        "image": ("image_overlay", {"x": 80, "y": 250, "width": 920, "height": 720}, 48, 104),
    },
    "linkedin_square": {
        "editorial": ("editorial", {"x": 80, "y": 210, "width": 920, "height": 560}, 44, 88),
        "evidence": ("metric", {"x": 80, "y": 180, "width": 920, "height": 660}, 40, 84),
        "system": ("framework", {"x": 80, "y": 180, "width": 920, "height": 660}, 38, 76),
        "image": ("image_overlay", {"x": 80, "y": 210, "width": 920, "height": 560}, 44, 88),
    },
    "linkedin_horizontal": {
        "editorial": ("editorial", {"x": 88, "y": 180, "width": 820, "height": 300}, 38, 70),
        "evidence": ("metric", {"x": 88, "y": 120, "width": 900, "height": 390}, 34, 66),
        "system": ("framework", {"x": 88, "y": 120, "width": 900, "height": 390}, 32, 60),
        "image": ("image_overlay", {"x": 88, "y": 160, "width": 900, "height": 330}, 38, 70),
    },
}

HEADLINES = {
    "normal": "Automatizar sin perder control humano",
    "long": "Un sistema visible para ordenar cada seguimiento comercial",
}


def payload(preset: str, output_format: str, headline: str) -> RenderOverlayRequest:
    layout, safe_zone, minimum, maximum = TEMPLATES[output_format][preset]
    is_instagram = output_format == "instagram_portrait"
    return RenderOverlayRequest.model_validate(
        {
            "layout": layout,
            "output_format": output_format,
            "source_url": "https://example.supabase.co/autopost.png" if preset == "image" else None,
            "destination_upload_url": "https://example.supabase.co/upload/test",
            "output_path": f"matrix/{preset}-{output_format}.{'jpg' if is_instagram else 'png'}",
            "output_mime": "image/jpeg" if is_instagram else "image/png",
            "headline": headline,
            "eyebrow": "Puna Tech · Operaciones",
            "body": "La automatización funciona cuando responsables y excepciones quedan claros." if preset in {"editorial", "evidence"} else None,
            "bullets": ["Definir responsables", "Registrar excepciones", "Revisar resultados"] if preset == "system" else [],
            "emphasis": "30%" if preset == "evidence" else None,
            "focal_point": {"x": 0.5, "y": 0.5} if preset == "image" else None,
            "safe_zone": safe_zone,
            "text_align": "left",
            "vertical_align": "top" if preset in {"evidence", "system"} else "center",
            "overlay_color": "#3B2A1E",
            "overlay_opacity": 0.58 if preset == "image" else 0,
            "text_color": "#FBF7F0" if preset == "image" else "#181410",
            "min_font_size": minimum,
            "max_font_size": maximum,
            "logo_enabled": True,
        }
    )


def contact_sheet(files: list[Path], output: Path) -> None:
    cards = [Image.open(path).convert("RGB") for path in files]
    thumb_width = 480
    label_height = 54
    thumbs = []
    for path, card in zip(files, cards):
        scale = thumb_width / card.width
        resized = card.resize((thumb_width, round(card.height * scale)), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (thumb_width, resized.height + label_height), "#FFFFFF")
        canvas.paste(resized, (0, 0))
        ImageDraw.Draw(canvas).text((14, resized.height + 14), path.stem, fill="#181410")
        thumbs.append(canvas)
    width = thumb_width * 2
    height = max(thumb.height for thumb in thumbs[:2]) + max(thumb.height for thumb in thumbs[2:])
    sheet = Image.new("RGB", (width, height), "#E8E2D8")
    y_offsets = [0, 0, max(thumb.height for thumb in thumbs[:2]), max(thumb.height for thumb in thumbs[:2])]
    for index, thumb in enumerate(thumbs):
        sheet.paste(thumb, ((index % 2) * thumb_width, y_offsets[index]))
    sheet.save(output, format="JPEG", quality=90, optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    editor = ImageEditorService()
    results = []
    with patch.object(editor, "_download_source", side_effect=lambda _url, size, centering: ImageOps.fit(source, size, method=Image.Resampling.LANCZOS, centering=centering)):
        for headline_kind, headline in HEADLINES.items():
            for output_format in TEMPLATES:
                rendered_files = []
                for preset in ("editorial", "evidence", "system", "image"):
                    request = payload(preset, output_format, headline)
                    content = editor.render(request)
                    extension = "jpg" if request.output_mime == "image/jpeg" else "png"
                    path = OUTPUT / f"{headline_kind}-{output_format}-{preset}.{extension}"
                    path.write_bytes(content)
                    image = Image.open(path)
                    expected_mime = "JPEG" if extension == "jpg" else "PNG"
                    if image.size != FORMATS[output_format] or image.format != expected_mime:
                        raise RuntimeError(f"Invalid output: {path}")
                    rendered_files.append(path)
                    results.append(
                        {
                            "file": path.name,
                            "preset": preset,
                            "headline": headline_kind,
                            "format": output_format,
                            "dimensions": list(image.size),
                            "mime": image.format,
                            "sha256": hashlib.sha256(content).hexdigest(),
                        }
                    )
                contact_sheet(rendered_files, OUTPUT / f"sheet-{headline_kind}-{output_format}.jpg")

    carousel = []
    for index, (role, headline) in enumerate(
        [
            ("cover", "Un sistema visible para no perder oportunidades"),
            ("content", "Definí responsables antes de automatizar"),
            ("content", "Registrá las excepciones para revisión humana"),
            ("content", "Medí el resultado sin inventar causalidad"),
            ("cta", "Ordená primero; automatizá después"),
        ],
        1,
    ):
        request = payload("editorial", "instagram_portrait", headline).model_copy(
            update={"composition_kind": "carousel_slide", "slide_role": role, "slide_number": index, "slide_count": 5}
        )
        content = editor.render(request)
        path = OUTPUT / f"carousel-instagram-{index}.jpg"
        path.write_bytes(content)
        carousel.append(path)
    pages = [Image.open(path).convert("RGB") for path in carousel]
    pages[0].save(OUTPUT / "carousel-linkedin-5-pages.pdf", format="PDF", save_all=True, append_images=pages[1:], resolution=150)
    (OUTPUT / "manifest.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps({"renders": len(results), "sheets": 6, "carousel_pages": len(carousel), "output": str(OUTPUT)}, indent=2))


if __name__ == "__main__":
    main()
