from __future__ import annotations

import math
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


WIDTH = 1920
HEIGHT = 1080
NAVY = "#07121f"
NAVY_2 = "#0b1b2b"
PANEL = "#102538"
PANEL_2 = "#152e43"
COPPER = "#e69a63"
COPPER_SOFT = "#a85f3f"
CREAM = "#f5f0e7"
MUTED = "#a8b6c4"
GREEN = "#61c7a0"
BLUE = "#70a7ff"
RED = "#f07878"


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    if mono:
        candidates = [Path("C:/Windows/Fonts/CascadiaMono.ttf"), Path("C:/Windows/Fonts/consola.ttf")]
    elif bold:
        candidates = [Path("C:/Windows/Fonts/segoeuib.ttf"), Path("C:/Windows/Fonts/arialbd.ttf")]
    else:
        candidates = [Path("C:/Windows/Fonts/segoeui.ttf"), Path("C:/Windows/Fonts/arial.ttf")]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


F14 = font(14)
F18 = font(18)
F20 = font(20)
F22 = font(22)
F24 = font(24)
F26 = font(26, bold=True)
F30 = font(30, bold=True)
F34 = font(34, bold=True)
F42 = font(42, bold=True)
F48 = font(48, bold=True)
F58 = font(58, bold=True)
F72 = font(72, bold=True)
F96 = font(96, bold=True)
FM18 = font(18, mono=True)
FM20 = font(20, mono=True)


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def background() -> Image.Image:
    top = hex_rgb(NAVY)
    bottom = hex_rgb(NAVY_2)
    image = Image.new("RGB", (WIDTH, HEIGHT), top)
    pixels = image.load()
    for y in range(HEIGHT):
        t = y / max(1, HEIGHT - 1)
        color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(WIDTH):
            pixels[x, y] = color
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for offset in range(7):
        points = []
        for x in range(-40, WIDTH + 40, 40):
            y = 170 + offset * 44 + 38 * math.sin((x / 185) + offset * 0.52)
            points.append((x, y))
        draw.line(points, fill=(230, 154, 99, 18), width=1)
    for x in range(90, WIDTH, 180):
        draw.line((x, 0, x, HEIGHT), fill=(112, 167, 255, 10), width=1)
    for y in range(80, HEIGHT, 120):
        draw.line((0, y, WIDTH, y), fill=(112, 167, 255, 8), width=1)
    return Image.alpha_composite(image.convert("RGBA"), overlay)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def add_shadow(canvas: Image.Image, box: tuple[int, int, int, int], radius: int = 28, alpha: int = 120) -> None:
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((x0 + 12, y0 + 18, x1 + 12, y1 + 18), radius, fill=(0, 0, 0, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(18))
    canvas.alpha_composite(layer)


def paste_cover(canvas: Image.Image, source: Image.Image, box: tuple[int, int, int, int], radius: int = 24) -> None:
    x0, y0, x1, y1 = box
    target = (x1 - x0, y1 - y0)
    source = source.convert("RGB")
    scale = max(target[0] / source.width, target[1] / source.height)
    resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - target[0]) // 2
    top = (resized.height - target[1]) // 2
    cropped = resized.crop((left, top, left + target[0], top + target[1])).convert("RGBA")
    canvas.paste(cropped, (x0, y0), rounded_mask(target, radius))


def paste_contain(canvas: Image.Image, source: Image.Image, box: tuple[int, int, int, int], radius: int = 22) -> None:
    x0, y0, x1, y1 = box
    target = (x1 - x0, y1 - y0)
    source = source.convert("RGB")
    scale = min(target[0] / source.width, target[1] / source.height)
    resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS).convert("RGBA")
    panel = Image.new("RGBA", target, hex_rgb(PANEL) + (255,))
    panel.alpha_composite(resized, ((target[0] - resized.width) // 2, (target[1] - resized.height) // 2))
    canvas.paste(panel, (x0, y0), rounded_mask(target, radius))


def pill(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fill: str, ink: str = NAVY, width: int | None = None) -> int:
    x, y = xy
    bbox = draw.textbbox((0, 0), text, font=F18)
    natural = bbox[2] - bbox[0] + 34
    w = width or natural
    draw.rounded_rectangle((x, y, x + w, y + 38), 19, fill=fill)
    draw.text((x + 17, y + 8), text, font=F18, fill=ink)
    return w


def header(canvas: Image.Image, scene: int, kicker: str, synthetic: bool = True) -> None:
    draw = ImageDraw.Draw(canvas)
    draw.text((72, 46), "Scout", font=F34, fill=CREAM)
    draw.text((181, 56), "COLLECTOR INTELLIGENCE", font=F18, fill=MUTED)
    pill(draw, (1415, 44), kicker.upper(), COPPER, NAVY, 300)
    if synthetic:
        pill(draw, (72, 1002), "SYNTHETIC DEMO DATA", PANEL_2, COPPER, 232)
        draw.text((322, 1012), "Every card, seller, listing, marketplace, and sale shown is fictional.", font=F18, fill=MUTED)
    draw.text((1775, 1012), f"{scene:02d} / 08", font=FM18, fill=MUTED)


def wrapped(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], width: int, *, font_obj: ImageFont.FreeTypeFont, fill: str, spacing: int = 8) -> None:
    avg = max(8, round(font_obj.size * 0.52))
    lines = textwrap.wrap(text, width=max(10, width // avg))
    draw.multiline_text(xy, "\n".join(lines), font=font_obj, fill=fill, spacing=spacing)


def scene_title(canvas: Image.Image, title: str, subtitle: str) -> None:
    draw = ImageDraw.Draw(canvas)
    draw.text((72, 142), title, font=F48, fill=CREAM)
    draw.text((74, 205), subtitle, font=F22, fill=MUTED)


def screenshot_scene(scene: int, kicker: str, title: str, subtitle: str, screenshot: Path, chips: list[tuple[str, str]]) -> Image.Image:
    canvas = background()
    header(canvas, scene, kicker)
    scene_title(canvas, title, subtitle)
    box = (72, 268, 1848, 946)
    add_shadow(canvas, box)
    paste_contain(canvas, Image.open(screenshot), box)
    draw = ImageDraw.Draw(canvas)
    x = 104
    for label, color in chips:
        w = pill(draw, (x, 884), label, color, NAVY)
        x += w + 14
    return canvas


def title_scene(og_path: Path) -> Image.Image:
    canvas = background()
    image = Image.open(og_path).convert("RGB")
    image = ImageEnhance.Brightness(image).enhance(0.82)
    paste_cover(canvas, image, (0, 0, WIDTH, HEIGHT), 0)
    veil = Image.new("RGBA", canvas.size, (4, 12, 22, 55))
    canvas = Image.alpha_composite(canvas, veil)
    draw = ImageDraw.Draw(canvas)
    pill(draw, (72, 58), "OPENAI WEBMCP CHALLENGE", COPPER, NAVY, 284)
    pill(draw, (372, 58), "2-MINUTE PRODUCT DEMO", PANEL_2, CREAM, 262)
    draw.rounded_rectangle((70, 860, 930, 976), 24, fill=(7, 18, 31, 214), outline=(230, 154, 99, 130), width=2)
    draw.text((102, 884), "Exact identity  •  Robust comps  •  Explainable trust", font=F26, fill=CREAM)
    draw.text((104, 930), "For people and agents — with uncertainty left visible.", font=F20, fill=MUTED)
    draw.text((1758, 1020), "01 / 08", font=FM18, fill=CREAM)
    return canvas


def identity_scene() -> Image.Image:
    canvas = background()
    header(canvas, 2, "NORMALIZE FIRST")
    scene_title(canvas, "Correct identity comes before price", "Scout refuses false equivalence across grade, condition, variant, and language.")
    draw = ImageDraw.Draw(canvas)
    labels = [
        ("PSA 10", "$512", "graded • exact company + grade", BLUE),
        ("PSA 9", "$286", "different market tier", COPPER),
        ("RAW NM", "$148", "condition-specific raw copy", GREEN),
    ]
    x_positions = [92, 690, 1288]
    for i, ((label, price, detail, color), x) in enumerate(zip(labels, x_positions)):
        box = (x, 318, x + 540, 840)
        add_shadow(canvas, box)
        draw.rounded_rectangle(box, 30, fill=PANEL, outline=color, width=3)
        pill(draw, (x + 32, 350), label, color, NAVY)
        draw.text((x + 34, 442), price, font=F72, fill=CREAM)
        draw.text((x + 36, 530), "90-DAY MEDIAN", font=F18, fill=MUTED)
        draw.line((x + 34, 584, x + 506, 584), fill=hex_rgb(PANEL_2), width=2)
        wrapped(draw, detail, (x + 34, 620), 460, font_obj=F24, fill=CREAM, spacing=9)
        if i < 2:
            draw.text((x + 555, 534), "≠", font=F58, fill=COPPER)
    draw.rounded_rectangle((270, 874, 1650, 950), 22, fill=PANEL_2)
    draw.text((318, 895), "SET  •  NUMBER  •  VARIANT  •  LANGUAGE  •  CONDITION  •  GRADER  •  GRADE", font=F22, fill=CREAM)
    return canvas


def webmcp_scene() -> Image.Image:
    canvas = background()
    header(canvas, 6, "AGENT + HUMAN")
    scene_title(canvas, "WebMCP is the product interface", "Structured tools and the collector workspace use the same market service and evidence.")
    draw = ImageDraw.Draw(canvas)
    query_box = (72, 282, 910, 525)
    add_shadow(canvas, query_box)
    draw.rounded_rectangle(query_box, 28, fill=PANEL, outline=COPPER, width=2)
    pill(draw, (104, 310), "BUYER REQUEST", COPPER, NAVY)
    query = '“Find CGC 10 Ember Dragon ex listings under $500, from sellers above 85 trust, and at least 5% below the exact 90-day median.”'
    wrapped(draw, query, (108, 372), 760, font_obj=F26, fill=CREAM, spacing=10)

    tool_x = 995
    for idx, (name, detail, color) in enumerate([
        ("find_deals", "budget + exact grade + trust + market delta", BLUE),
        ("compare_listings", "total cost + comps + trust + alerts", GREEN),
    ]):
        y = 282 + idx * 164
        draw.rounded_rectangle((tool_x, y, 1848, y + 132), 24, fill=PANEL, outline=color, width=2)
        draw.text((tool_x + 30, y + 24), name, font=FM20, fill=color)
        draw.text((tool_x + 30, y + 72), detail, font=F20, fill=CREAM)

    result = (72, 582, 1848, 932)
    add_shadow(canvas, result)
    draw.rounded_rectangle(result, 28, fill="#091723", outline=PANEL_2, width=2)
    draw.text((108, 614), "STRUCTURED RESULT", font=F18, fill=MUTED)
    code = [
        ('"data_mode"', ': "SYNTHETIC",', COPPER),
        ('"exact_tier"', ': "CGC 10",', BLUE),
        ('"total"', ': "$425.00",', CREAM),
        ('"vs_90d_median"', ': "9.2% below",', GREEN),
        ('"seller_trust"', ': 98,', CREAM),
        ('"ui_state"', ': { "selected_listing": "..." }', BLUE),
    ]
    y = 662
    for key, value, color in code:
        draw.text((110, y), key, font=FM20, fill=color)
        draw.text((350, y), value, font=FM20, fill=CREAM)
        y += 38
    draw.rounded_rectangle((940, 638, 1808, 888), 24, fill=PANEL)
    draw.text((978, 670), "Same evidence, visible on screen", font=F30, fill=CREAM)
    draw.text((980, 725), "• exact tier preserved", font=F22, fill=GREEN)
    draw.text((980, 769), "• score components explained", font=F22, fill=GREEN)
    draw.text((980, 813), "• provenance + limitations attached", font=F22, fill=GREEN)
    return canvas


def closing_scene(og_path: Path) -> Image.Image:
    canvas = background()
    draw = ImageDraw.Draw(canvas)
    pill(draw, (72, 58), "SCOUT", COPPER, NAVY, 110)
    draw.text((72, 160), "One honest evidence trail.", font=F72, fill=CREAM)
    draw.text((75, 250), "Exact identity. Robust comps. Seller context. Clear uncertainty.", font=F30, fill=MUTED)
    box = (72, 338, 1050, 922)
    add_shadow(canvas, box)
    paste_cover(canvas, Image.open(og_path), box, 28)
    draw.rounded_rectangle((1100, 338, 1848, 922), 28, fill=PANEL, outline=PANEL_2, width=2)
    draw.text((1142, 384), "TRY SCOUT", font=F20, fill=COPPER)
    draw.text((1142, 430), "Live WebMCP demo", font=F34, fill=CREAM)
    wrapped(draw, "scout-webmcp-2026.alx21.chatgpt.site", (1142, 482), 630, font_obj=FM20, fill=BLUE, spacing=8)
    draw.line((1142, 562, 1806, 562), fill=hex_rgb(PANEL_2), width=2)
    draw.text((1142, 606), "PUBLIC SOURCE", font=F20, fill=COPPER)
    wrapped(draw, "github.com/agammann/scout-webmcp", (1142, 654), 630, font_obj=FM20, fill=BLUE, spacing=8)
    draw.line((1142, 744, 1806, 744), fill=hex_rgb(PANEL_2), width=2)
    draw.text((1142, 792), "Know the market before", font=F30, fill=CREAM)
    draw.text((1142, 836), "you make the offer.", font=F30, fill=COPPER)
    draw.text((1775, 1012), "08 / 08", font=FM18, fill=MUTED)
    return canvas


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: render-scout-demo.py PROJECT_ROOT OUTPUT_DIRECTORY", file=sys.stderr)
        return 2
    root = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    og = root / "public" / "og.png"
    shots = root / "docs" / "screenshots"
    scenes = [
        title_scene(og),
        identity_scene(),
        screenshot_scene(3, "MARKET EVIDENCE", "Know what the market actually says", "Shipping-inclusive totals, exact comparable sales, robust medians, range, sample size, and confidence.", shots / "market-overview.png", [("$425 TOTAL", COPPER), ("9.2% BELOW 90D", GREEN), ("12 EXACT SALES", BLUE)]),
        screenshot_scene(4, "COMPARE", "The lowest sticker price is not the whole purchase", "Align total cost, market delta, Seller Trust, returns, comparable quality, and warnings.", shots / "listing-comparison.png", [("TOTAL COST", COPPER), ("SELLER TRUST", BLUE), ("RISK EVIDENCE", RED)]),
        screenshot_scene(5, "EXPLAINABILITY", "Scores show their work — or stay withheld", "Price evidence leads. Confidence, seller history, listing quality, and liquidity remain inspectable.", shots / "methodology.png", [("DEAL SCORE", COPPER), ("TRUST SCORE", BLUE), ("CONFIDENCE", GREEN)]),
        webmcp_scene(),
        screenshot_scene(7, "DATA HONESTY", "Synthetic today. Provider-ready tomorrow.", "Capabilities are explicit. Unavailable live integrations stay disabled. Production and demo data never mix silently.", shots / "data-sources.png", [("SYNTHETIC ONLY", COPPER), ("NO SCRAPING", GREEN), ("ADAPTER BOUNDARY", BLUE)]),
        closing_scene(og),
    ]
    for index, scene in enumerate(scenes, 1):
        scene.convert("RGB").save(output / f"scene-{index:02d}.png", quality=96)
    print(f"rendered {len(scenes)} Scout demo scenes to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
