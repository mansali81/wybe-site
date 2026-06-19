#!/usr/bin/env python3
"""
Erase the Gemini badge by cloning a nearby clean patch over it, then
feathering the seam. Works better than inpainting on textured backgrounds
(wet brick, gym floor) where inpainting smudges the pattern.

Usage:
    python3 scripts/erase_gemini_badge_clone.py <image-path>
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DST_DIR = ROOT / "images" / "cleaned"

# ROI to search for the badge inside. Wider/taller than strictly necessary so
# we don't clip the very tips of the star at the ROI border.
ROI_X = 0.80
ROI_Y = 0.88

# Brightness-keyed detector to find the badge bbox.
VAL_OFFSET = 50
VAL_FLOOR  = 110
SAT_MAX    = 90

# Padding around the detected bounding box, in px, before we patch over it.
# Generous padding so the star's outer tips and any soft halo are fully inside
# the cloned patch.
BBOX_PAD = 55

# Direction to sample the clean source patch from, in image px. Positive dx
# moves right, positive dy moves down. We sample a patch the same shape as
# the badge bbox shifted by this offset, then paste it over the badge.
SAMPLE_OFFSET_X = -240   # 240 px to the LEFT of the badge
SAMPLE_OFFSET_Y = 0


def clean(src: Path, dst: Path) -> None:
    data = np.fromfile(str(src), dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f"could not read: {src}")

    h, w = img.shape[:2]
    has_alpha = img.ndim == 3 and img.shape[2] == 4
    bgr = img[:, :, :3] if has_alpha else img.copy()

    # Locate the badge bbox in the ROI using brightness keying.
    x1 = int(w * ROI_X); y1 = int(h * ROI_Y)
    roi = bgr[y1:h, x1:w]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    s, v = hsv[:, :, 1], hsv[:, :, 2]
    val_thresh = max(VAL_FLOOR, int(v.mean()) + VAL_OFFSET)
    det = (v >= val_thresh) & (s <= SAT_MAX)
    ys, xs = np.where(det)
    if len(xs) == 0:
        print(f"  ! no badge-bright pixels detected in ROI of {src.name} — skipping")
        return

    bx1 = max(0, int(xs.min()) - BBOX_PAD) + x1
    by1 = max(0, int(ys.min()) - BBOX_PAD) + y1
    bx2 = min(w, int(xs.max()) + BBOX_PAD + x1)
    by2 = min(h, int(ys.max()) + BBOX_PAD + y1)
    bw = bx2 - bx1
    bh = by2 - by1

    # Compute the source patch position (clipped to the image).
    sx1 = bx1 + SAMPLE_OFFSET_X
    sy1 = by1 + SAMPLE_OFFSET_Y
    sx2 = sx1 + bw
    sy2 = sy1 + bh
    if sx1 < 0 or sy1 < 0 or sx2 > w or sy2 > h:
        raise SystemExit(
            f"sample window out of bounds: ({sx1},{sy1})-({sx2},{sy2}) "
            f"for image {w}x{h}; adjust SAMPLE_OFFSET_X / SAMPLE_OFFSET_Y"
        )

    src_patch = bgr[sy1:sy2, sx1:sx2].copy()

    # Build a feather mask so the seam isn't a hard edge.
    mask = np.zeros((bh, bw), dtype=np.float32)
    feather = 18
    mask[feather:-feather, feather:-feather] = 1.0
    mask = cv2.GaussianBlur(mask, (feather * 2 + 1, feather * 2 + 1), 0)
    mask3 = cv2.merge([mask, mask, mask])

    # Blend the cloned patch over the badge area.
    region = bgr[by1:by2, bx1:bx2].astype(np.float32)
    blended = src_patch.astype(np.float32) * mask3 + region * (1 - mask3)
    bgr[by1:by2, bx1:bx2] = blended.astype(np.uint8)

    cleaned = np.dstack([bgr, img[:, :, 3]]) if has_alpha else bgr
    dst.parent.mkdir(parents=True, exist_ok=True)
    ok, buf = cv2.imencode(".png", cleaned)
    if not ok:
        raise SystemExit("could not encode")
    dst.write_bytes(buf.tobytes())

    print(f"  cleaned: {src.name}  ->  {dst.relative_to(ROOT)}")
    print(f"           badge bbox:  ({bx1}, {by1}) - ({bx2}, {by2})  ({bw}x{bh}px)")
    print(f"           sample from: ({sx1}, {sy1}) - ({sx2}, {sy2})")


def main(argv: list[str]) -> int:
    if not argv:
        print("usage: erase_gemini_badge_clone.py <image-path>")
        return 1
    src = Path(argv[0])
    if not src.is_absolute():
        src = (ROOT / src).resolve()
    dst = DST_DIR / src.name
    clean(src, dst)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
