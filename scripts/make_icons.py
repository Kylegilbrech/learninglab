#!/usr/bin/env python3
"""Generate app icons + splash for Gridiron Fantasy (no external assets)."""
from PIL import Image, ImageDraw, ImageFont
import os, math

OUT = os.path.join(os.path.dirname(__file__), "..", "www", "icons")
RES = os.path.join(os.path.dirname(__file__), "..", "resources")
os.makedirs(OUT, exist_ok=True)
os.makedirs(RES, exist_ok=True)

BG1 = (10, 22, 46)      # deep navy
BG2 = (7, 27, 18)       # field green-navy
LIME = (198, 242, 78)
LIME_D = (164, 214, 47)
WHITE = (255, 255, 255)

def font(size):
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def vgrad(size, top, bottom):
    img = Image.new("RGB", (size, size), top)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=c)
    return img

def draw_field_lines(d, size, alpha=26):
    step = size // 8
    for x in range(step, size, step):
        d.line([(x, 0), (x, size)], fill=(255, 255, 255, alpha), width=max(1, size // 220))

def football(d, cx, cy, w, h):
    """Draw a stylized football (lime) centered at cx,cy."""
    bbox = [cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2]
    d.ellipse(bbox, fill=LIME)
    # darker rim
    d.ellipse(bbox, outline=LIME_D, width=max(2, w // 22))
    # center seam (along the long axis) + perpendicular laces
    seam = w // 4
    d.line([(cx - seam, cy), (cx + seam, cy)], fill=BG1, width=max(3, w // 20))
    tick = h // 7
    for i in range(-3, 4):
        x = cx + i * (seam // 3.5)
        x = int(x)
        d.line([(x, cy - tick), (x, cy + tick)], fill=BG1, width=max(2, w // 30))
    # end seams
    d.line([(cx - w // 2 + w // 12, cy - h // 8), (cx - w // 2 + w // 12, cy + h // 8)], fill=BG1, width=max(2, w // 30))
    d.line([(cx + w // 2 - w // 12, cy - h // 8), (cx + w // 2 - w // 12, cy + h // 8)], fill=BG1, width=max(2, w // 30))

def make_icon(size, maskable=False):
    base = vgrad(size, BG1, BG2)
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    draw_field_lines(od, size, alpha=22)
    # top glow
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-size * 0.3, -size * 0.6, size * 1.3, size * 0.6],
               fill=(40, 70, 140, 60))
    overlay = Image.alpha_composite(overlay, glow)
    img = Image.alpha_composite(base.convert("RGBA"), overlay)

    d = ImageDraw.Draw(img)
    inset = int(size * (0.30 if maskable else 0.24))
    football(d, size // 2, int(size * 0.44), size - inset * 2, int((size - inset * 2) * 0.62))

    # "GRIDIRON" not legible tiny; use big G above football? Keep clean: football is the mark.
    # add a subtle "G" watermark behind? skip for clarity.
    return img.convert("RGB")

def make_maskable(size):
    return make_icon(size, maskable=True)

def make_splash(w, h):
    img = Image.new("RGB", (w, h), BG1)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        c = tuple(int(BG1[i] + (BG2[i] - BG1[i]) * t) for i in range(3))
        d.line([(0, y), (w, y)], fill=c)
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    step = w // 10
    for x in range(step, w, step):
        od.line([(x, 0), (x, h)], fill=(255, 255, 255, 16), width=2)
    img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    d = ImageDraw.Draw(img)
    cx, cy = w // 2, int(h * 0.42)
    fw = int(min(w, h) * 0.34)
    football(d, cx, cy, fw, int(fw * 0.62))
    f = font(int(min(w, h) * 0.075))
    txt = "GRIDIRON"
    tb = d.textbbox((0, 0), txt, font=f)
    d.text((cx - (tb[2] - tb[0]) // 2, cy + fw // 2 + int(h * 0.02)), txt, font=f, fill=WHITE)
    f2 = font(int(min(w, h) * 0.028))
    sub = "FANTASY MANAGER"
    tb2 = d.textbbox((0, 0), sub, font=f2)
    d.text((cx - (tb2[2] - tb2[0]) // 2, cy + fw // 2 + int(h * 0.115)), sub, font=f2, fill=LIME)
    return img

# web/PWA icons
make_icon(192).save(f"{OUT}/icon-192.png")
make_icon(512).save(f"{OUT}/icon-512.png")
make_maskable(512).save(f"{OUT}/icon-maskable-512.png")
make_icon(180).save(f"{OUT}/apple-touch-icon.png")
make_icon(32).save(f"{OUT}/favicon-32.png")

# Capacitor asset sources (feed to `npx @capacitor/assets generate`)
make_icon(1024).save(f"{RES}/icon.png")
make_icon(1024, maskable=True).save(f"{RES}/icon-foreground.png")
Image.new("RGB", (1024, 1024), BG1).save(f"{RES}/icon-background.png")
make_splash(2732, 2732).save(f"{RES}/splash.png")
make_splash(2732, 2732).save(f"{RES}/splash-dark.png")

print("Icons + splash written to", OUT, "and", RES)
