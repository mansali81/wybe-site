#!/usr/bin/env python3
"""
Erase the Gemini AI badge from the bottom-right corner of each image.

Strategy:
  1. Build a mask covering the bottom-right region where Gemini places its
     small attribution badge. The badge is roughly inset 2-4% from the right
     and bottom edges and is about 10-14% of the image width.
  2. Use OpenCV inpainting (TELEA algorithm) to fill the masked area using
     surrounding pixel context. This blends smoothly on uniform backgrounds
     and is acceptable on busier ones.
  3. Save the result to images/cleaned/<same filename> so the originals are
     untouched and side-by-side comparison is easy.

Run from the repo root:
    python3 scripts/erase_gemini_badge.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "images"
DST_DIR = SRC_DIR / "cleaned"

# Bottom-right mask box, expressed as fractions of (W, H).
# Tuned to cover the standard Gemini badge with a small margin of safety.
MASK_RIGHT_FRAC = 0.02   # inset from right edge
MASK_BOTTOM_FRAC = 0.02  # inset from bottom edge
MASK_WIDTH_FRAC = 0.18   # how wide the mask is, as a fraction of image width
MASK_HEIGHT_FRAC = 0.09  # how tall the mask is, as a fraction of image height

INPAINT_RADIUS = 5  # px


def clean_image(src: Path, dst: Path) -> None:
    # Use cv2 for inpainting but preserve PNG alpha by handling RGBA separately.
    data = np.fromfile(str(src), dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"  ! could not read: {src.name}")
        return

    h, w = img.shape[:2]
    x1 = int(w * (1 - MASK_RIGHT_FRAC - MASK_WIDTH_FRAC))
    y1 = int(h * (1 - MASK_BOTTOM_FRAC - MASK_HEIGHT_FRAC))
    x2 = int(w * (1 - MASK_RIGHT_FRAC))
    y2 = int(h * (1 - MASK_BOTTOM_FRAC))

    mask = np.zeros((h, w), dtype=np.uint8)
    mask[y1:y2, x1:x2] = 255

    if img.ndim == 3 and img.shape[2] == 4:
        # Split alpha; inpaint BGR; leave alpha alone, then re-merge.
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
        cleaned_bgr = cv2.inpaint(bgr, mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)
        cleaned = np.dstack([cleaned_bgr, alpha])
    else:
        cleaned = cv2.inpaint(img, mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)

    # Encode and write with the same extension as the source.
    ext = src.suffix.lower()
    encode_ext = ".png" if ext == ".png" else ".jpg"
    params = [cv2.IMWRITE_JPEG_QUALITY, 92] if encode_ext == ".jpg" else []
    ok, buf = cv2.imencode(encode_ext, cleaned, params)
    if not ok:
        print(f"  ! could not encode: {src.name}")
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(buf.tobytes())
    print(f"  cleaned: {src.name}  ->  {dst.relative_to(ROOT)}  ({w}x{h}, masked {x2-x1}x{y2-y1})")


def main() -> int:
    if not SRC_DIR.exists():
        print(f"source folder not found: {SRC_DIR}")
        return 1
    DST_DIR.mkdir(parents=True, exist_ok=True)

    targets = sorted(
        p for p in SRC_DIR.iterdir()
        if p.is_file()
        and p.suffix.lower() in {".png", ".jpg", ".jpeg"}
        and not p.name.startswith(".")
    )

    if not targets:
        print("no images found")
        return 0

    print(f"processing {len(targets)} image(s) -> {DST_DIR.relative_to(ROOT)}")
    for src in targets:
        clean_image(src, DST_DIR / src.name)
    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
