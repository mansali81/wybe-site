#!/usr/bin/env python3
"""
Final OpenCV iteration: tight bottom-right ROI, brightness-keyed detection,
generous dilation, TELEA inpaint. Designed to ONLY erase pixels around the
Gemini badge in the very corner — won't touch reflections elsewhere in the
image. Quality is fundamentally capped by OpenCV's inpainting; busy textures
will still show a soft patch.

Usage:
    python3 scripts/erase_gemini_badge_v3.py <image-path>
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DST_DIR = ROOT / "images" / "cleaned"

# Very tight bottom-right ROI: only the corner the badge sits in. Tuned to
# avoid the bright gym-sign reflection that creeps up the pavement.
ROI_X = 0.88
ROI_Y = 0.92

# Brightness-keyed detector: the badge is whitish so the saturation must be
# below SAT_MAX and the value above an adaptive threshold.
VAL_OFFSET = 40
VAL_FLOOR  = 100
SAT_MAX    = 100

# Mask shaping. Dilate aggressively so the soft halo around the star tips is
# fully masked. Without enough dilation the TELEA inpaint sees a faint star
# silhouette at the mask border and recreates it as a ghost.
DILATE_KSIZE = 21
DILATE_ITERS = 4

INPAINT_RADIUS = 25


def clean(src: Path, dst: Path) -> None:
    data = np.fromfile(str(src), dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f"could not read: {src}")

    h, w = img.shape[:2]
    has_alpha = img.ndim == 3 and img.shape[2] == 4
    bgr = img[:, :, :3] if has_alpha else img

    x1 = int(w * ROI_X); y1 = int(h * ROI_Y)
    roi = bgr[y1:h, x1:w]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    s, v = hsv[:, :, 1], hsv[:, :, 2]
    val_thresh = max(VAL_FLOOR, int(v.mean()) + VAL_OFFSET)
    det = ((v >= val_thresh) & (s <= SAT_MAX)).astype(np.uint8) * 255

    # Embed the detector into the full-image mask, then dilate hard so the
    # entire star (including faint outer halo) is inside the mask.
    mask = np.zeros((h, w), dtype=np.uint8)
    mask[y1:h, x1:w] = det
    k = np.ones((DILATE_KSIZE, DILATE_KSIZE), np.uint8)
    mask = cv2.dilate(mask, k, iterations=DILATE_ITERS)

    if not mask.any():
        print(f"  ! no badge-bright pixels in ROI of {src.name}")
        return

    cleaned_bgr = cv2.inpaint(bgr, mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)
    cleaned = np.dstack([cleaned_bgr, img[:, :, 3]]) if has_alpha else cleaned_bgr

    dst.parent.mkdir(parents=True, exist_ok=True)
    ok, buf = cv2.imencode(".png", cleaned)
    if not ok:
        raise SystemExit("could not encode")
    dst.write_bytes(buf.tobytes())

    pct = 100.0 * mask.sum() / 255 / (h * w)
    print(f"  cleaned: {src.name}  ->  {dst.relative_to(ROOT)}  (mask {pct:.3f}%)")


def main(argv: list[str]) -> int:
    if argv:
        targets = []
        for a in argv:
            p = Path(a) if Path(a).is_absolute() else (ROOT / a).resolve()
            targets.append(p)
    else:
        # Process every image in images/ (skip hidden/system files and the
        # cleaned/ subdir).
        src_dir = ROOT / "images"
        targets = sorted(
            p for p in src_dir.iterdir()
            if p.is_file()
            and p.suffix.lower() in {".png", ".jpg", ".jpeg"}
            and not p.name.startswith(".")
        )

    if not targets:
        print("no images to process")
        return 0

    print(f"processing {len(targets)} image(s) -> {DST_DIR.relative_to(ROOT)}")
    for src in targets:
        clean(src, DST_DIR / src.name)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
