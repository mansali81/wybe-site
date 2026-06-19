#!/usr/bin/env python3
"""
Erase the Gemini AI badge using a colour-keyed mask + Navier-Stokes inpaint.

Improvements over v1:
  * Mask is built from saturation/value thresholds inside a small bottom-right
    ROI, instead of a generic rectangle. We only erase the badge pixels, not the
    surrounding background, so detail next to the badge is preserved.
  * Mask is morphologically closed + dilated so the inpaint has a few pixels of
    surrounding context to read from.
  * Uses cv2.INPAINT_NS (Navier-Stokes) with a wider radius — smoother result on
    smooth backgrounds like wet pavement or wood than the TELEA algorithm.
  * Designed to be invoked on a single file so we can review the output before
    running it across every asset.

Usage:
    python3 scripts/erase_gemini_badge_v2.py images/Outside\\ Gym.png
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DST_DIR = ROOT / "images" / "cleaned"

# ROI as fractions of (w, h). Tight bottom-right corner where Gemini places
# its badge. Tuned with a small margin so a dilated mask still has room.
ROI_X = 0.83   # inset from left as a fraction of width (so ROI starts here)
ROI_Y = 0.93   # inset from top as a fraction of height

# Brightness-based mask: the Gemini badge is a near-WHITE 4-pointed star.
# White pixels have low saturation but high value (brightness). We pick any
# pixel inside the ROI that is significantly brighter than the local
# neighbourhood — that's the badge, regardless of what colour the background is.
#
# In practice we set VAL_MIN relative to the ROI's mean brightness so the same
# script works on both dark (wet pavement) and lighter backgrounds. SAT_MAX
# excludes saturated coloured elements (street lights, neon) that happen to be
# bright but aren't the white badge.
VAL_OFFSET = 50   # badge must be at least mean(V) + 50 brighter
VAL_FLOOR  = 110  # absolute floor, in case the ROI is very dark overall
SAT_MAX    = 90   # badge is whitish, so exclude saturated bright pixels

# Mask post-processing kernel sizes (px). Close fills small holes inside the
# badge; dilate extends the mask outward so the inpaint blends with neighbours.
CLOSE_KSIZE  = 9
DILATE_KSIZE = 17
DILATE_ITERS = 3

INPAINT_RADIUS = 18  # px — larger radius pulls context from further away


def clean(src: Path, dst: Path) -> None:
    data = np.fromfile(str(src), dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f"could not read: {src}")

    h, w = img.shape[:2]
    x1 = int(w * ROI_X)
    y1 = int(h * ROI_Y)
    x2 = w
    y2 = h

    # Strip alpha for processing; we'll restore it at the end.
    has_alpha = img.ndim == 3 and img.shape[2] == 4
    bgr = img[:, :, :3] if has_alpha else img

    # Stage 1: brightness-keyed detector in the ROI to locate the badge.
    roi = bgr[y1:y2, x1:x2]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    s, v = hsv[:, :, 1], hsv[:, :, 2]
    val_thresh = max(VAL_FLOOR, int(v.mean()) + VAL_OFFSET)
    detector = ((v >= val_thresh) & (s <= SAT_MAX)).astype(np.uint8) * 255

    # Stage 2: take the bounding box of detected pixels (plus padding) and
    # mask the whole rectangle, not just the bright pixels. This kills the
    # "ghost" where soft star edges weren't bright enough to trip the
    # threshold but still bled into the inpaint result.
    ys, xs = np.where(detector > 0)
    if len(xs) == 0:
        print(f"  ! no badge-bright pixels detected in ROI of {src.name} — skipping")
        return
    pad = 22  # px around the detected bbox
    bx1 = max(0, xs.min() - pad)
    by1 = max(0, ys.min() - pad)
    bx2 = min(detector.shape[1], xs.max() + pad)
    by2 = min(detector.shape[0], ys.max() + pad)

    mask = np.zeros((h, w), dtype=np.uint8)
    mask[y1 + by1 : y1 + by2, x1 + bx1 : x1 + bx2] = 255

    # Small dilation just to soften the edges of the rectangle.
    dilate_k = np.ones((DILATE_KSIZE, DILATE_KSIZE), np.uint8)
    mask = cv2.dilate(mask, dilate_k, iterations=DILATE_ITERS)

    # Navier-Stokes inpaint for smoother gradients on busy textures.
    cleaned_bgr = cv2.inpaint(bgr, mask, INPAINT_RADIUS, cv2.INPAINT_NS)
    cleaned = np.dstack([cleaned_bgr, img[:, :, 3]]) if has_alpha else cleaned_bgr

    dst.parent.mkdir(parents=True, exist_ok=True)
    ok, buf = cv2.imencode(".png", cleaned)
    if not ok:
        raise SystemExit(f"could not encode: {src.name}")
    dst.write_bytes(buf.tobytes())

    pct = 100.0 * mask.sum() / 255 / (h * w)
    print(f"  cleaned: {src.name}  ->  {dst.relative_to(ROOT)}")
    print(f"           image {w}x{h}, mask covers {pct:.3f}% of pixels")


def main(argv: list[str]) -> int:
    if not argv:
        print("usage: erase_gemini_badge_v2.py <image-path>")
        return 1
    src = Path(argv[0])
    if not src.is_absolute():
        src = (ROOT / src).resolve()
    dst = DST_DIR / src.name
    clean(src, dst)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
