#!/usr/bin/env python3
"""把 assets/item-icon/*.png（1024 透明原图）裁掉透明留白，居中缩放到 assets/icons-web/。

规则与 V1.1 P0 的 9 张图标一致：
  1. 按 alpha 通道裁到主体包围盒；
  2. 补成正方形画布（长边两侧各约 9% 透明边距，与 P0 成品留白对齐）；
  3. LANCZOS 缩放到目标尺寸，保留 RGBA。
默认小图标 96px；空状态插画用 --empty-size 指定更大尺寸（默认 360px）。
build.py 随后把 icons-web/ 内联进单文件 HTML。

用法：
  python3 scripts/prepare-icons.py                 # 全量重算（小图标 96 / 空状态 360）
  python3 scripts/prepare-icons.py loc-kitchen empty-pets ...   # 只处理指定图标
  python3 scripts/prepare-icons.py --empty-size 300
"""
import argparse
import pathlib
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
src_dir = root / "assets" / "item-icon"
out_dir = root / "assets" / "icons-web"

# 空状态插画在页面里显示约 140–150px，需要更高分辨率才不糊
EMPTY_PREFIX = "empty-"


def prepare(src: pathlib.Path, dst: pathlib.Path, size: int) -> tuple:
    im = Image.open(src).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        raise ValueError(f"{src}: 全透明或没有 alpha 通道")
    crop = im.crop(bbox)
    w, h = crop.size
    side = int(round(max(w, h) * 1.18))  # 与 P0 成品相同的视觉留白
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(crop, ((side - w) // 2, (side - h) // 2))
    canvas = canvas.resize((size, size), Image.LANCZOS)
    canvas.save(dst, optimize=True)
    return bbox, canvas.getchannel("A").getbbox()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--empty-size", type=int, default=360)
    ap.add_argument("names", nargs="*", help="只处理这些图标名（不含 .png，默认全量）")
    args = ap.parse_args()

    out_dir.mkdir(parents=True, exist_ok=True)
    selected = set(args.names)
    for f in sorted(src_dir.glob("*.png")):
        if selected and f.stem not in selected:
            continue
        size = args.empty_size if f.stem.startswith(EMPTY_PREFIX) else 96
        src_bbox, dst_bbox = prepare(f, out_dir / f.name, size)
        kb = (out_dir / f.name).stat().st_size / 1024
        print(f"{f.stem:22s} {size:4d}px  bbox={src_bbox} -> {dst_bbox}  {kb:.1f} KB")


if __name__ == "__main__":
    main()
