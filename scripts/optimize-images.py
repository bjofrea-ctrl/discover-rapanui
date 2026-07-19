#!/usr/bin/env python3
"""
Image optimization script for Discover Rapa Nui.
Converts images to WebP/AVIF with multiple responsive sizes.
"""

import os
import sys
from pathlib import Path
from PIL import Image

SRC_DIR = Path("/Users/agentes/discover-rapanui/frontend/assets/images")
OUT_DIR = SRC_DIR / "optimized"

# Responsive breakpoints (width in pixels)
SIZES = {
    "xs": 480,    # mobile
    "sm": 768,    # tablet
    "md": 1024,   # laptop
    "lg": 1440,   # desktop
    "xl": 1920,   # large desktop
}

# Quality settings per format
WEBP_QUALITY = 82
AVIF_QUALITY = 55
JPEG_QUALITY = 85

# Images referenced in HTML
REFERENCED_IMAGES = [
    "hero.jpg",
    "hero2.jpg",
    "gallery1.jpg",
    "gallery2.jpg",
    "gallery3.jpg",
    "gallery4.jpg",
    "gallery5.jpg",
    "gallery6.jpg",
    "gallery7.jpg",
    "gallery8.jpg",
]


def optimize_image(src_path: Path, out_dir: Path, basename: str):
    """Generate optimized versions of an image."""
    try:
        img = Image.open(src_path)
        original_width, original_height = img.size
        aspect_ratio = original_height / original_width

        # Convert to RGB if needed (for JPEG/WebP)
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        results = {"original": {"width": original_width, "height": original_height}}

        for size_name, target_width in SIZES.items():
            if target_width >= original_width:
                # Don't upscale
                continue

            target_height = int(target_width * aspect_ratio)
            resized = img.resize((target_width, target_height), Image.LANCZOS)

            size_dir = out_dir / size_name
            size_dir.mkdir(parents=True, exist_ok=True)

            # WebP
            webp_path = size_dir / f"{basename}.webp"
            resized.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
            results.setdefault(size_name, {})["webp"] = {
                "path": str(webp_path.relative_to(out_dir)),
                "width": target_width,
                "height": target_height,
                "size": webp_path.stat().st_size,
            }

            # AVIF (if supported)
            try:
                avif_path = size_dir / f"{basename}.avif"
                resized.save(avif_path, "AVIF", quality=AVIF_QUALITY)
                results[size_name]["avif"] = {
                    "path": str(avif_path.relative_to(out_dir)),
                    "width": target_width,
                    "height": target_height,
                    "size": avif_path.stat().st_size,
                }
            except Exception:
                pass  # AVIF not supported in this PIL build

            # JPEG fallback
            jpg_path = size_dir / f"{basename}.jpg"
            resized.save(jpg_path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            results[size_name]["jpg"] = {
                "path": str(jpg_path.relative_to(out_dir)),
                "width": target_width,
                "height": target_height,
                "size": jpg_path.stat().st_size,
            }

        # Also save original as WebP (full size)
        full_dir = out_dir / "full"
        full_dir.mkdir(parents=True, exist_ok=True)
        webp_full = full_dir / f"{basename}.webp"
        img.save(webp_full, "WEBP", quality=WEBP_QUALITY, method=6)
        results["full"] = {
            "webp": {"path": str(webp_full.relative_to(out_dir)), "width": original_width, "height": original_height, "size": webp_full.stat().st_size}
        }

        try:
            avif_full = full_dir / f"{basename}.avif"
            img.save(avif_full, "AVIF", quality=AVIF_QUALITY)
            results["full"]["avif"] = {"path": str(avif_full.relative_to(out_dir)), "width": original_width, "height": original_height, "size": avif_full.stat().st_size}
        except Exception:
            pass

        return results

    except Exception as e:
        print(f"  ✗ Error processing {src_path.name}: {e}")
        return None


def generate_picture_html(basename: str, alt: str, css_class: str = "", sizes: str = "100vw") -> str:
    """Generate <picture> element HTML with responsive sources."""
    basename_no_ext = Path(basename).stem
    sources = []

    for size_name in ["xl", "lg", "md", "sm", "xs"]:
        if size_name not in SIZES:
            continue
        width = SIZES[size_name]
        sources.append(f'    <source srcset="assets/images/optimized/{size_name}/{basename_no_ext}.avif" type="image/avif" media="(max-width: {width}px)">')
        sources.append(f'    <source srcset="assets/images/optimized/{size_name}/{basename_no_ext}.webp" type="image/webp" media="(max-width: {width}px)">')
        sources.append(f'    <source srcset="assets/images/optimized/{size_name}/{basename_no_ext}.jpg" type="image/jpeg" media="(max-width: {width}px)">')

    # Full size fallback
    sources.append(f'    <source srcset="assets/images/optimized/full/{basename_no_ext}.avif" type="image/avif">')
    sources.append(f'    <source srcset="assets/images/optimized/full/{basename_no_ext}.webp" type="image/webp">')

    sources_html = "\n".join(sources)

    return f'''<picture class="{css_class}">
{sources_html}
    <img src="assets/images/optimized/full/{basename_no_ext}.jpg" alt="{alt}" loading="lazy" sizes="{sizes}">
</picture>'''


def main():
    print(f"🖼️  Optimizing images from {SRC_DIR}")
    print(f"📁 Output: {OUT_DIR}\n")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    all_results = {}

    for img_name in REFERENCED_IMAGES:
        src_path = SRC_DIR / img_name
        if not src_path.exists():
            print(f"  ⚠️  Not found: {img_name}")
            continue

        basename = Path(img_name).stem
        print(f"  Processing: {img_name}...")
        results = optimize_image(src_path, OUT_DIR, basename)
        if results:
            all_results[img_name] = results
            original_size = src_path.stat().st_size
            webp_full_size = results["full"]["webp"]["size"]
            savings = (1 - webp_full_size / original_size) * 100
            print(f"    ✓ {original_size:,} → {webp_full_size:,} bytes ({savings:.1f}% smaller)")

    # Generate HTML snippets for reference
    print("\n📝 Generating HTML snippets...")
    snippets_dir = OUT_DIR / "_html_snippets"
    snippets_dir.mkdir(exist_ok=True)

    # Hero images
    hero_snippet = generate_picture_html("hero.jpg", "Boda en Rapa Nui al atardecer", "hero-bg", "100vw")
    hero2_snippet = generate_picture_html("hero2.jpg", "Equipo Discover Rapa Nui en la isla", "about-image", "50vw")

    # Gallery images
    gallery_snippets = []
    for i in range(1, 9):
        alt_map = {
            1: "Boda Rapa Nui ceremonia atardecer",
            2: "Ceremonia ancestral Rapa Nui",
            3: "Pareja en Rapa Nui",
            4: "Atardecer en Tahai moai",
            5: "Moai en Rapa Nui",
            6: "Tour guiado Rapa Nui",
            7: "Cabaña boutique vista mar",
            8: "Experiencia cultural Rapa Nui",
        }
        css_class = "tall" if i in (1, 3) else ("wide" if i == 5 else "")
        snippet = generate_picture_html(f"gallery{i}.jpg", alt_map[i], css_class, "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw")
        gallery_snippets.append(snippet)

    # Save snippets
    (snippets_dir / "hero.html").write_text(hero_snippet)
    (snippets_dir / "hero2.html").write_text(hero2_snippet)
    (snippets_dir / "gallery.html").write_text("\n".join(gallery_snippets))

    # Save manifest
    import json
    manifest = {
        "sizes": SIZES,
        "images": all_results,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))

    print(f"\n✅ Done! Optimized images in: {OUT_DIR}")
    print(f"📄 HTML snippets in: {snippets_dir}")
    print(f"📋 Manifest: {OUT_DIR / 'manifest.json'}")


if __name__ == "__main__":
    main()