"""
Takes a source logo (gold on a solid background — either a baked-in
transparency checkerboard OR a solid black), rebuilds real transparency,
isolates the logo content, retints to brand gold, and writes public/logo.png.

Auto-detects whether the background is light-gray checkerboard or near-black
by sampling a corner pixel.
"""
import colorsys
import sys
from PIL import Image
from pathlib import Path

# Default source; override with CLI arg.
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("public/logo deer.png")
DST = Path("public/logo.png")

# Target brand gold = Tailwind amber-400 = #fbbf24 = rgb(251, 191, 36).
# Keep per-pixel lightness (preserves the logo's gradient shading) and
# replace hue + saturation with the brand values.
BRAND_H = 43 / 360
BRAND_S = 0.96

img = Image.open(SRC).convert("RGBA")
w, h = img.size
pixels = img.load()

# Detect background by sampling many edge pixels (corners alone can hit stray
# noise). Median brightness of the edges tells us dark vs light bg.
edge_samples = []
for x in range(0, w, 16):
    edge_samples.append(sum(pixels[x, 0][:3]) / 3)
    edge_samples.append(sum(pixels[x, h - 1][:3]) / 3)
for y in range(0, h, 16):
    edge_samples.append(sum(pixels[0, y][:3]) / 3)
    edge_samples.append(sum(pixels[w - 1, y][:3]) / 3)
edge_samples.sort()
corner_brightness = edge_samples[len(edge_samples) // 2]  # median
bg_is_dark = corner_brightness < 60
print(f"corner brightness={corner_brightness:.0f} -> bg={'dark' if bg_is_dark else 'light'}")

# Step 1: rebuild transparency.
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        spread = max(r, g, b) - min(r, g, b)
        brightness = (r + g + b) / 3

        if bg_is_dark:
            # Dark bg: keep only gold-colored pixels. Drop near-black (bg) AND
            # near-gray/white (encoder noise, stray edge pixels that aren't
            # part of the warm gold logo).
            is_achromatic = spread <= 10
            if brightness <= 30 and is_achromatic:
                pixels[x, y] = (r, g, b, 0)  # black bg
            elif is_achromatic:
                pixels[x, y] = (r, g, b, 0)  # gray/white noise
            elif brightness <= 60:
                # Anti-aliased gold edge bleeding into black — fade alpha.
                alpha = int(255 * (brightness - 30) / 30)
                pixels[x, y] = (r, g, b, max(0, min(255, alpha)))
        else:
            # Light/checkerboard background: bright near-gray pixels → transparent.
            if spread <= 6 and brightness >= 180:
                pixels[x, y] = (r, g, b, 0)
            elif spread <= 15 and brightness >= 170:
                alpha = int(255 * (spread / 15) * ((255 - brightness) / 85))
                pixels[x, y] = (r, g, b, max(0, min(255, alpha)))

# Step 2: retint opaque pixels to brand gold, preserving per-pixel lightness.
# For dark-bg sources, the gold was shaded against black so mid-range pixels
# have low lightness — we bump the floor so the retint doesn't render as brown.
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        _, l_, _ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if bg_is_dark:
            l_ = 0.30 + l_ * 0.42  # deepen so gold reads rich, not pale
        nr, ng, nb = colorsys.hls_to_rgb(BRAND_H, l_, BRAND_S)
        pixels[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)

# Step 3: find content bbox (this logo has no adjacent wordmark to avoid).
MIN_COL_PIXELS = 3
# Higher row threshold trims thin tapering extremities (e.g. long tails/manes)
# so the crop stays focused on the main mass of the deer.
MIN_ROW_PIXELS = 18

def column_content(x: int) -> int:
    return sum(1 for y in range(h) if pixels[x, y][3] > 20)

def row_content(y: int) -> int:
    return sum(1 for x in range(w) if pixels[x, y][3] > 20)

left = 0
for x in range(w):
    if column_content(x) >= MIN_COL_PIXELS:
        left = x
        break
right = w - 1
for x in range(w - 1, -1, -1):
    if column_content(x) >= MIN_COL_PIXELS:
        right = x
        break
top = 0
for y in range(h):
    if row_content(y) >= MIN_ROW_PIXELS:
        top = y
        break
bottom = h - 1
for y in range(h - 1, -1, -1):
    if row_content(y) >= MIN_ROW_PIXELS:
        bottom = y
        break

# Step 4: crop with a small padding.
PAD = 16
l = max(0, left - PAD)
t = max(0, top - PAD)
r_ = min(w, right + PAD + 1)
b_ = min(h, bottom + PAD + 1)

print(f"detected bbox: left={left} top={top} right={right} bottom={bottom}")
print(f"crop with padding: left={l} top={t} right={r_} bottom={b_}")
print(f"output size: {r_-l} x {b_-t}")

cropped = img.crop((l, t, r_, b_))
cropped.save(DST, "PNG", optimize=True)
print(f"wrote {DST} ({DST.stat().st_size} bytes)")
