#!/usr/bin/env python3
"""
Remove the Gemini badge from a video.

Strategy:
  1. Open the video, read frame 0, build a brightness-keyed mask of the badge.
     The badge is static (same position in every frame) so one mask is enough.
  2. Dump every frame as a PNG into a temp dir.
  3. Run iopaint (LaMa) in batch mode — one mask applied to every frame.
     iopaint loads the model once and chews through the folder.
  4. Reassemble the cleaned frames into an MP4 using OpenCV.

Originals are NEVER overwritten. Output is written next to the source with
a `_clean.mp4` suffix.

Usage:
    python3 scripts/erase_gemini_video.py Video/deadlift.mp4
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
IOPAINT = "/Users/mansour/Library/Python/3.9/bin/iopaint"

# Detection ROI and thresholds (same as the image script).
ROI_X = 0.83
ROI_Y = 0.85           # video is wider/shorter than the portraits, so start higher
VAL_OFFSET = 35
VAL_FLOOR  = 95
SAT_MAX    = 110
BBOX_PAD   = 30
DILATE_KS  = 9
DILATE_IT  = 2


def make_mask(frame: np.ndarray) -> np.ndarray | None:
    """Return a uint8 mask the same size as frame: 255 where to inpaint."""
    h, w = frame.shape[:2]
    x1 = int(w * ROI_X)
    y1 = int(h * ROI_Y)
    roi = frame[y1:h, x1:w]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    s, v = hsv[:, :, 1], hsv[:, :, 2]
    candidates = [
        (max(VAL_FLOOR, int(v.mean()) + VAL_OFFSET), SAT_MAX),
        (max(VAL_FLOOR, int(v.mean()) + 15),         SAT_MAX),
        (int(np.percentile(v, 99.0)),                SAT_MAX + 30),
        (int(np.percentile(v, 99.5)),                255),
    ]
    det = None
    for val_thresh, sat_max in candidates:
        d = (v >= val_thresh) & (s <= sat_max)
        if d.sum() >= 30:
            det = d
            break
    if det is None:
        return None

    ys, xs = np.where(det)
    bx1 = max(0, int(xs.min()) - BBOX_PAD) + x1
    by1 = max(0, int(ys.min()) - BBOX_PAD) + y1
    bx2 = min(w, int(xs.max()) + BBOX_PAD + x1)
    by2 = min(h, int(ys.max()) + BBOX_PAD + y1)
    mask = np.zeros((h, w), dtype=np.uint8)
    mask[by1:by2, bx1:bx2] = 255
    k = np.ones((DILATE_KS, DILATE_KS), np.uint8)
    mask = cv2.dilate(mask, k, iterations=DILATE_IT)
    return mask


def extract_frames(src: Path, out_dir: Path) -> tuple[int, int, float, int]:
    """Dump every frame to out_dir as zero-padded PNG. Returns (w, h, fps, count)."""
    cap = cv2.VideoCapture(str(src))
    if not cap.isOpened():
        raise SystemExit(f"could not open video: {src}")
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    nframes = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    out_dir.mkdir(parents=True, exist_ok=True)
    idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        cv2.imwrite(str(out_dir / f"frame_{idx:05d}.png"), frame)
        idx += 1
    cap.release()
    return w, h, fps, idx


def run_iopaint(image_dir: Path, mask_file: Path, out_dir: Path) -> bool:
    cmd = [
        IOPAINT, "run",
        "--model", "lama",
        "--device", "cpu",
        "--image", str(image_dir),
        "--mask", str(mask_file),
        "--output", str(out_dir),
    ]
    r = subprocess.run(cmd, text=True)
    return r.returncode == 0


def write_video(frame_dir: Path, dst: Path, w: int, h: int, fps: float,
                source: Path | None = None) -> None:
    """Encode the cleaned PNG frames into a high-quality H.264 MP4 with ffmpeg.

    If ``source`` is provided we also copy its audio stream over, so the
    cleaned video keeps the original soundtrack.
    """
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    cmd = [
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", f"{fps:g}",
        "-i", str(frame_dir / "frame_%05d.png"),
    ]
    if source is not None:
        cmd += ["-i", str(source)]

    cmd += [
        "-c:v", "libx264",
        "-preset", "slow",     # better compression at same quality
        "-crf", "18",          # visually lossless; close to original quality
        "-pix_fmt", "yuv420p", # required for browser compatibility
    ]
    if source is not None:
        # Take video from the PNG sequence (input 0), audio from the source
        # video (input 1). -shortest stops at the end of whichever ends first.
        cmd += ["-map", "0:v:0", "-map", "1:a:0?", "-c:a", "copy", "-shortest"]

    cmd += ["-movflags", "+faststart", str(dst)]

    r = subprocess.run(cmd)
    if r.returncode != 0:
        raise SystemExit("ffmpeg encoding failed")


def main(argv: list[str]) -> int:
    if not argv:
        print("usage: erase_gemini_video.py <video-path>")
        return 1
    src = Path(argv[0])
    if not src.is_absolute():
        src = (ROOT / src).resolve()
    if not src.exists():
        raise SystemExit(f"not found: {src}")

    print(f"Reading {src.name} …")
    cap = cv2.VideoCapture(str(src))
    if not cap.isOpened():
        raise SystemExit("could not open video")
    ret, frame0 = cap.read()
    cap.release()
    if not ret:
        raise SystemExit("could not read first frame")

    print("Building static mask from frame 0 …")
    mask = make_mask(frame0)
    if mask is None:
        raise SystemExit("no badge-bright pixels detected; tune thresholds")

    with tempfile.TemporaryDirectory(prefix="vid_") as td:
        td = Path(td)
        frames_in = td / "in"; frames_out = td / "out"; mask_dir = td / "mask"
        frames_in.mkdir(); frames_out.mkdir(); mask_dir.mkdir()

        print("Extracting frames …")
        w, h, fps, n = extract_frames(src, frames_in)
        print(f"  {n} frames, {w}x{h} @ {fps:.2f}fps")

        # iopaint expects the mask to have the same filename as the image when
        # given a folder, or a single file that applies to all. We use the
        # single-file form so one mask covers every frame.
        mask_file = mask_dir / "mask.png"
        cv2.imwrite(str(mask_file), mask)

        print("Running LaMa across every frame … (this takes a few minutes)")
        if not run_iopaint(frames_in, mask_file, frames_out):
            raise SystemExit("iopaint failed")

        print(f"Reassembling cleaned video → {src.parent}/{src.stem}_clean.mp4")
        dst = src.parent / f"{src.stem}_clean.mp4"
        write_video(frames_out, dst, w, h, fps, source=src)
        print(f"  done: {dst}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
