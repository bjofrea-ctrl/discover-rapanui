#!/usr/bin/env python3
"""
Update HTML files to use optimized WebP/AVIF images with <picture> elements.
"""

import re
from pathlib import Path

INDEX_HTML = Path("/Users/agentes/discover-rapanui/frontend/index.html")
PORTAL_HTML = Path("/Users/agentes/discover-rapanui/frontend/portal.html")

# Preload links for CSS background images
PRELOAD_LINKS = '''  <!-- Preload optimized hero images -->
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/full/hero.webp" media="(min-width: 1025px)">
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/lg/hero.webp" media="(max-width: 1024px)">
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/md/hero.webp" media="(max-width: 768px)">
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/sm/hero.webp" media="(max-width: 480px)">

  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/full/hero2.webp" media="(min-width: 1025px)">
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/lg/hero2.webp" media="(max-width: 1024px)">
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/md/hero2.webp" media="(max-width: 768px)">
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/sm/hero2.webp" media="(max-width: 480px)">

  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/full/gallery7.webp" media="(min-width: 1025px)">
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/full/gallery8.webp" media="(min-width: 1025px)">'''

def build_picture(name: str, alt: str, css_class: str = "", sizes: str = "100vw") -> str:
    """Generate <picture> element for an optimized image."""
    stem = Path(name).stem
    sizes_list = ["xl", "lg", "md", "sm", "xs"]
    max_widths = [1920, 1440, 1024, 768, 480]
    
    sources = []
    for size, mw in zip(sizes_list, max_widths):
        sources.append(f'    <source srcset="assets/images/optimized/{size}/{stem}.avif" type="image/avif" media="(max-width: {mw}px)">')
        sources.append(f'    <source srcset="assets/images/optimized/{size}/{stem}.webp" type="image/webp" media="(max-width: {mw}px)">')
        sources.append(f'    <source srcset="assets/images/optimized/{size}/{stem}.jpg" type="image/jpeg" media="(max-width: {mw}px)">')
    
    # Full size fallback
    sources.append(f'    <source srcset="assets/images/optimized/full/{stem}.avif" type="image/avif">')
    sources.append(f'    <source srcset="assets/images/optimized/full/{stem}.webp" type="image/webp">')
    
    class_attr = f' class="{css_class}"' if css_class else ''
    sources_html = "\n".join(sources)
    
    return f'''<picture{class_attr}>
{sources_html}
    <img src="assets/images/optimized/full/{stem}.jpg" alt="{alt}" loading="lazy" sizes="{sizes}">
</picture>'''

# Gallery images config
GALLERY_IMAGES = [
    ("gallery1.jpg", "Boda Rapa Nui ceremonia atardecer", "tall", "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"),
    ("gallery2.jpg", "Ceremonia ancestral Rapa Nui", "", "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"),
    ("gallery3.jpg", "Pareja en Rapa Nui", "tall", "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"),
    ("gallery4.jpg", "Atardecer en Tahai moai", "", "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"),
    ("gallery5.jpg", "Moai en Rapa Nui", "wide", "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"),
    ("gallery6.jpg", "Tour guiado Rapa Nui", "", "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"),
    ("gallery7.jpg", "Cabaña boutique vista mar", "", "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"),
    ("gallery8.jpg", "Experiencia cultural Rapa Nui", "", "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"),
]

# Tour images config
TOUR_IMAGES = [
    ("gallery1.jpg", "Tour Rapa Nui"),
    ("gallery2.jpg", "Atardecer Rapa Nui"),
    ("gallery3.jpg", "Ceremonia ancestral Rapa Nui"),
    ("gallery4.jpg", "Snorkel Rapa Nui"),
    ("gallery5.jpg", "Cabalgata Rapa Nui"),
    ("gallery6.jpg", "Gastronomía Rapa Nui"),
]

def update_index_html():
    html = INDEX_HTML.read_text(encoding='utf-8')
    
    # 1. Add preload links in head (after stylesheet link)
    html = html.replace(
        '<link rel="stylesheet" href="assets/css/style.css">',
        f'<link rel="stylesheet" href="assets/css/style.css">\n{PRELOAD_LINKS}'
    )
    
    # 2. Replace hero background div with picture element (but keep CSS working)
    # The hero uses CSS background, so we'll keep the div but add a hidden picture for preload
    # Actually, better: keep CSS background, the preload links handle it
    
    # 3. Replace gallery images
    gallery_html = "\n      ".join(
        build_picture(name, alt, css_class, sizes) 
        for name, alt, css_class, sizes in GALLERY_IMAGES
    )
    
    # Find and replace gallery grid content
    gallery_pattern = r'(<div class="gallery-grid">\n)(.*?)(\n    </div>)'
    replacement = f'\\1{gallery_html}\\3'
    html = re.sub(gallery_pattern, replacement, html, flags=re.DOTALL)
    
    # 4. Replace tour card images
    for i, (img_name, alt) in enumerate(TOUR_IMAGES):
        old_img = f'<img src="assets/images/{img_name}" alt="{alt}" loading="lazy">'
        picture = build_picture(img_name, alt, "", "100vw")
        # Tour cards have the image as first child, replace it
        html = html.replace(old_img, picture)
    
    INDEX_HTML.write_text(html, encoding='utf-8')
    print(f"✅ Updated {INDEX_HTML}")

def update_portal_html():
    html = PORTAL_HTML.read_text(encoding='utf-8')
    
    # Add preload for portal hero
    portal_preload = '''  <!-- Preload optimized portal hero image -->
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/full/hero.webp" media="(min-width: 1025px)">
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/lg/hero.webp" media="(max-width: 1024px)">
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/md/hero.webp" media="(max-width: 768px)">
  <link rel="preload" as="image" type="image/webp" href="assets/images/optimized/sm/hero.webp" media="(max-width: 480px)">'''
    
    html = html.replace(
        '<link rel="stylesheet" href="assets/css/style.css">',
        f'<link rel="stylesheet" href="assets/css/style.css">\n{portal_preload}'
    )
    
    PORTAL_HTML.write_text(html, encoding='utf-8')
    print(f"✅ Updated {PORTAL_HTML}")

if __name__ == "__main__":
    update_index_html()
    update_portal_html()
    print("Done!")