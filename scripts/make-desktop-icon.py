#!/usr/bin/env python3
"""
임시 데스크톱 아이콘 생성기.

- 1024x1024 PNG 마스터 한 장 그리고
- sips + iconutil 로 icon.icns (mac)
- PIL multi-size 로 icon.ico (win)
- 1024 PNG 그대로 icon.png (linux)
출력: desktop/build/

디자인: macOS 스타일 squircle + 그라데이션 다크 + 흰색 "C".
교체 시 같은 자리에 진짜 PNG 한 장 (1024+) 두고 다시 실행.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pathlib import Path
import subprocess
import shutil
import tempfile
import sys

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "desktop" / "build"
SIZE = 1024


def squircle_mask(size: int, radius_ratio: float = 0.225) -> Image.Image:
    """macOS Big Sur 이후의 둥근 사각형 마스크 (대략적 근사)."""
    r = int(size * radius_ratio)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=r, fill=255)
    return mask


def gradient(size: int, top: tuple, bottom: tuple) -> Image.Image:
    img = Image.new("RGB", (size, size), top)
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        for x in range(size):
            px[x, y] = (r, g, b)
    return img


def find_font(size_px: int) -> ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size_px)
            except Exception:
                continue
    return ImageFont.load_default()


def make_master() -> Image.Image:
    # 배경: 살짝 보라기 도는 딥 차콜 → 거의 블랙. Claude 톤과 안 부딪히게 중성.
    bg = gradient(SIZE, (44, 40, 56), (16, 14, 22))
    mask = squircle_mask(SIZE)

    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    img.paste(bg, (0, 0), mask)

    # 내부 그림자(상단 하이라이트) — 살짝 입체감.
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-SIZE * 0.4, -SIZE * 0.9, SIZE * 1.4, SIZE * 0.6),
               fill=(255, 255, 255, 38))
    glow = glow.filter(ImageFilter.GaussianBlur(SIZE * 0.08))
    img.alpha_composite(Image.composite(glow, Image.new("RGBA", glow.size, (0, 0, 0, 0)), mask))

    # 글자 "C" — 굵게 가운데. (Claude Ad Terminal 의 "C".)
    draw = ImageDraw.Draw(img)
    font = find_font(int(SIZE * 0.62))
    text = "C"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (SIZE - tw) // 2 - bbox[0]
    ty = (SIZE - th) // 2 - bbox[1] - int(SIZE * 0.02)
    # 글자 그림자
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.text((tx, ty + int(SIZE * 0.012)), text, font=font, fill=(0, 0, 0, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(SIZE * 0.012))
    img.alpha_composite(shadow)
    # 본 글자
    draw.text((tx, ty), text, font=font, fill=(245, 240, 235, 255))

    # squircle 바깥은 다시 한 번 알파 마스킹 (혹시 모를 누수 제거).
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def make_icns(master_png: Path, out_path: Path) -> None:
    sizes = [16, 32, 64, 128, 256, 512, 1024]
    with tempfile.TemporaryDirectory() as td:
        iconset = Path(td) / "icon.iconset"
        iconset.mkdir()
        for s in sizes:
            base = iconset / f"icon_{s}x{s}.png"
            subprocess.run(
                ["sips", "-z", str(s), str(s), str(master_png), "--out", str(base)],
                check=True, capture_output=True,
            )
            if s <= 512:
                retina = iconset / f"icon_{s}x{s}@2x.png"
                subprocess.run(
                    ["sips", "-z", str(s * 2), str(s * 2), str(master_png), "--out", str(retina)],
                    check=True, capture_output=True,
                )
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(out_path)], check=True)


def make_ico(master: Image.Image, out_path: Path) -> None:
    # Windows 는 256 까지가 표준 (PNG-in-ICO).
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    master.save(out_path, format="ICO", sizes=sizes)


def main() -> int:
    BUILD.mkdir(parents=True, exist_ok=True)
    master = make_master()
    png_path = BUILD / "icon.png"
    master.save(png_path, format="PNG")
    print(f"wrote {png_path}")

    icns_path = BUILD / "icon.icns"
    make_icns(png_path, icns_path)
    print(f"wrote {icns_path}")

    ico_path = BUILD / "icon.ico"
    make_ico(master, ico_path)
    print(f"wrote {ico_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
