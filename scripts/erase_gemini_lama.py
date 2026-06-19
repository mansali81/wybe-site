#!/usr/bin/env python3
"""
Erase the Gemini badge from every image in images/ using iopaint + the LaMa
inpainting model. This is the same class of model many commercial tools use
for object removal, so it handles textured backgrounds (wet brick, carpet,
wood floor, gym mats) much better than OpenCV's classical inpaint.

Pipeline per image:
  1. Detect the badge by brightness-keying inside a tight bottom-right ROI
     (the Gemini badge is whitish, the ROI is small so we don't pick up
     unrelated bright objects).
  2. Take the bounding box of detected pixels, pad and dilate it so the
     entire star + soft halo is inside the mask.
  3. Write the mask to a temp file and call iopaint to inpaint.
  4. Save the cleaned PNG into images/cleaned/, keeping the original intact.

Originals are NEVER overwritten.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "images"
DST_DIR = SRC_DIR / "cleaned"
IOPAINT = "/Users/mansour/Library/Python/3.9/bin/iopaint"

# Detection ROI (fractions of width / height). Tight to the bottom-right
# corner so we don't pick up unrelated bright objects elsewhere.
ROI_X = 0.83
ROI_Y = 0.90

VAL_OFFSET = 35
VAL_FLOOR  = 95
SAT_MAX    = 110
BBOX_PAD   = 30           # px around the detected bbox
DILATE_KS  = 9
DILATE_IT  = 2

# Files we skip — these don't have a Gemini badge or the cutout doesn't match
# the pattern (transparent PNG of just the silhouette).
SKIP = {"Sitting on Stool with eye closed.png"}


def make_mask(img: np.ndarray) -> np.ndarray | None:
    """Return a uint8 mask the same size as img: 255 where to inpaint, 0 elsewhere.

    Tries progressively looser thresholds so the same logic works on dark
    backgrounds (wet brick) and light backgrounds (grey concrete) where the
    badge contrast is small.
    """
    h, w = img.shape[:2]
    bgr = img[:, :, :3]
    x1 = int(w * ROI_X)
    y1 = int(h * ROI_Y)

    roi = bgr[y1:h, x1:w]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    s, v = hsv[:, :, 1], hsv[:, :, 2]

    # Try progressively looser thresholds. If the badge is on a bright
    # background, mean+offset can exceed the badge brightness — fall back to
    # the 99th percentile of the ROI which adapts to whatever's there.
    candidates = [
        (max(VAL_FLOOR, int(v.mean()) + VAL_OFFSET), SAT_MAX),
        (max(VAL_FLOOR, int(v.mean()) + 15),         SAT_MAX),
        (int(np.percentile(v, 99.0)),                SAT_MAX + 30),
        (int(np.percentile(v, 99.5)),                255),
    ]
    det = None
    for val_thresh, sat_max in candidates:
        d = (v >= val_thresh) & (s <= sat_max)
        if d.sum() >= 30:    # enough pixels to be a real badge, not a single noise dot
            det = d
            break
    if det is None:
        return None

    ys, xs = np.where(det)
    if len(xs) == 0:
        return None

    bx1 = max(0, int(xs.min()) - BBOX_PAD) + x1
    by1 = max(0, int(ys.min()) - BBOX_PAD) + y1
    bx2 = min(w, int(xs.max()) + BBOX_PAD + x1)
    by2 = min(h, int(ys.max()) + BBOX_PAD + y1)

    mask = np.zeros((h, w), dtype=np.uint8)
    mask[by1:by2, bx1:bx2] = 255
    k = np.ones((DILATE_KS, DILATE_KS), np.uint8)
    mask = cv2.dilate(mask, k, iterations=DILATE_IT)
    return mask


def run_iopaint(image: Path, mask: Path, out_dir: Path) -> bool:
    cmd = [
        IOPAINT, "run",
        "--model", "lama",
        "--device", "cpu",
        "--image", str(image),
        "--mask", str(mask),
        "--output", str(out_dir),
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if r.returncode != 0:
            print(f"     iopaint stderr: {r.stderr[-500:]}")
            return False
        return True
    except subprocess.TimeoutExpired:
        print("     iopaint timed out")
        return False


def process(src: Path, tmp_dir: Path) -> str:
    """Returns one of: 'ok', 'no-mask', 'skip', 'iopaint-failed'."""
    data = np.fromfile(str(src), dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_UNCHANGED)
    if img is None:
        return "skip"

    mask = make_mask(img)
    if mask is None:
        return "no-mask"

    # iopaint expects same-name files in image folder and mask folder.
    img_tmp = tmp_dir / "img"
    msk_tmp = tmp_dir / "msk"
    out_tmp = tmp_dir / "out"
    for d in (img_tmp, msk_tmp, out_tmp):
        d.mkdir(parents=True, exist_ok=True)
        # Clear any previous run's files so iopaint's batch picks up only this image.
        for old in d.iterdir():
            old.unlink()

    # Copy source (use the canonical name) and write mask alongside.
    shutil.copyfile(src, img_tmp / src.name)
    mask_path = msk_tmp / src.name
    ok, buf = cv2.imencode(".png", mask)
    if not ok:
        return "skip"
    mask_path.write_bytes(buf.tobytes())

    if not run_iopaint(img_tmp / src.name, mask_path, out_tmp):
        return "iopaint-failed"

    # iopaint writes the result under out_tmp with the same filename.
    candidates = list(out_tmp.iterdir())
    if not candidates:
        return "iopaint-failed"
    # Find the file that matches our input by stem
    out_file = next((c for c in candidates if c.stem == src.stem), candidates[0])

    DST_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(out_file, DST_DIR / src.name)
    return "ok"


def main(argv: list[str]) -> int:
    targets = []
    if argv:
        for a in argv:
            p = Path(a) if Path(a).is_absolute() else (ROOT / a).resolve()
            targets.append(p)
    else:
        for p in sorted(SRC_DIR.iterdir()):
            if (
                p.is_file()
                and p.suffix.lower() in {".png", ".jpg", ".jpeg"}
                and not p.name.startswith(".")
                and p.name not in SKIP
            ):
                targets.append(p)

    if not targets:
        print("no images to process")
        return 0

    with tempfile.TemporaryDirectory(prefix="lama_") as tmpdir:
        tmp = Path(tmpdir)
        print(f"processing {len(targets)} image(s) via iopaint+LaMa -> {DST_DIR.relative_to(ROOT)}")
        for src in targets:
            result = process(src, tmp)
            print(f"  {result:>14s} : {src.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
