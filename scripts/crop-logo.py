"""
Takes public/logo-full.png (gold logo on a baked-in transparency checkerboard),
rebuilds real transparency, isolates just the deer mark on the left, and writes
public/logo.png.
"""
import colorsys
from PIL import Image
from pathlib import Path

SRC = Path("public/logo-full.png")
DST = Path("public/logo.png")

# Target brand gold = Tailwind amber-400 = #fbbf24 = rgb(251, 191, 36).
# Warmer/more orange than yellow-400. Keep per-pixel lightness to preserve the
# logo's gradient shading; replace hue and saturation with brand values.
BRAND_H = 43 / 360
BRAND_S = 0.96

img = Image.open(SRC).convert("RGBA")
w, h = img.size
pixels = img.load()

# Step 1: rebuild transparency.
# The background is a light-gray checkerboard (~209 and ~223 R=G=B).
# The logo is gold (R > G > B, warm).
# Anywhere the pixel is near-gray and bright, make it transparent.
# Also fade anti-aliased edges proportionally.
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        # Max channel spread — low spread means the pixel is desaturated (gray).
        spread = max(r, g, b) - min(r, g, b)
        brightness = (r + g + b) / 3

        if spread <= 6 and brightness >= 180:
            # Pure background gray — fully transparent.
            pixels[x, y] = (r, g, b, 0)
        elif spread <= 15 and brightness >= 170:
            # Anti-aliased edge — partially transparent. Lower alpha the closer
            # to gray/bright it is.
            alpha = int(255 * (spread / 15) * ((255 - brightness) / 85))
            pixels[x, y] = (r, g, b, max(0, min(255, alpha)))

# Step 2: find the vertical gap between the deer and the wordmark.
# Scan columns from the left; find where gold content starts, then find the
# first long run of empty columns after it — that's the gap before "DYLA".
# Step 1.5: retint opaque pixels to brand gold, preserving per-pixel lightness.
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        _, l_, _ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        nr, ng, nb = colorsys.hls_to_rgb(BRAND_H, l_, BRAND_S)
        pixels[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)

MIN_COL_PIXELS = 3  # ignore columns with only a few stray pixels (anti-aliasing noise)

def column_content(x: int) -> int:
    return sum(1 for y in range(h) if pixels[x, y][3] > 20)

def column_has_content(x: int) -> bool:
    return column_content(x) >= MIN_COL_PIXELS

# Find deer start
deer_left = 0
for x in range(w):
    if column_has_content(x):
        deer_left = x
        break

# Find the gap: after deer_left, scan for a run of empty columns.
GAP_RUN = 12
empty_count = 0
deer_right = w
for x in range(deer_left, w):
    if column_has_content(x):
        empty_count = 0
    else:
        empty_count += 1
        if empty_count >= GAP_RUN:
            deer_right = x - GAP_RUN
            break

# Step 3: find vertical bounds within the deer horizontal range.
# Use a row-wise scan with a min-pixel threshold to ignore stray artifacts.
MIN_ROW_PIXELS = 3
def row_content(y: int) -> int:
    return sum(1 for x in range(deer_left, deer_right + 1) if pixels[x, y][3] > 20)

deer_top = 0
for y in range(h):
    if row_content(y) >= MIN_ROW_PIXELS:
        deer_top = y
        break
deer_bottom = h - 1
for y in range(h - 1, -1, -1):
    if row_content(y) >= MIN_ROW_PIXELS:
        deer_bottom = y
        break

# Step 4: crop with a small padding.
PAD = 16
left = max(0, deer_left - PAD)
top = max(0, deer_top - PAD)
right = min(w, deer_right + PAD)
bottom = min(h, deer_bottom + PAD)

print(f"detected deer bbox: left={deer_left} top={deer_top} right={deer_right} bottom={deer_bottom}")
print(f"crop with padding:  left={left} top={top} right={right} bottom={bottom}")
print(f"output size: {right-left} x {bottom-top}")

cropped = img.crop((left, top, right, bottom))
cropped.save(DST, "PNG", optimize=True)
print(f"wrote {DST} ({DST.stat().st_size} bytes)")
