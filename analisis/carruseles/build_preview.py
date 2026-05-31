#!/usr/bin/env python3
"""Genera preview.html con todas las imágenes de carrusel embebidas."""
import os, json, glob, urllib.parse

BASE = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(BASE, 'output')

EMOJIS = ['🏝️', '📋', '💡', '💬']
TYPE_NAMES = ['Inspiracional', 'Servicios', 'Educativo', 'Social Proof']

def human_name(name):
    return name.replace('_', ' ').title()

def build():
    dirs = sorted(os.listdir(OUTPUT))
    carousels = []

    for d in dirs:
        dp = os.path.join(OUTPUT, d)
        if not os.path.isdir(dp): continue
        meta_f = os.path.join(dp, '_meta.json')
        if not os.path.exists(meta_f): continue
        with open(meta_f) as f:
            meta = json.load(f)
        slides = []
        for fn in meta['files']:
            fpath = os.path.join(OUTPUT, d, fn)
            sz = os.path.getsize(fpath)
            rel = os.path.join('output', d, fn)
            slides.append({'file': rel, 'num': fn.replace('slide_','').replace('.jpg',''), 'size_kb': sz // 1024})
        carousels.append({
            'dir': d,
            'carousel': meta['carousel'],
            'date': meta['date'],
            'slides': meta['slides'],
            'slides_data': slides,
        })

    # Build HTML
    cards_html = ''
    nav_html = ''
    total_slides = 0

    for idx, c in enumerate(carousels):
        emoji = EMOJIS[idx] if idx < len(EMOJIS) else '📸'
        tn = TYPE_NAMES[idx] if idx < len(TYPE_NAMES) else 'General'
        total_slides += c['slides']

        nav_html += f'    <a href="#carousel-{idx}">{emoji} {human_name(c["carousel"])} ({c["slides"]})</a>\n'

        cards_html += f'''
  <div class="carousel-section" id="carousel-{idx}">
    <div class="carousel-header">
      <span class="carousel-emoji">{emoji}</span>
      <h2>{human_name(c["carousel"])}</h2>
      <span class="carousel-badge">{tn}</span>
    </div>
    <div class="carousel-meta">
      <span>📅 {c["date"][:4]}-{c["date"][4:6]}-{c["date"][6:8]}</span>
      <span>📄 {c["slides"]} slides</span>
    </div>
    <div class="slides-grid">
'''
        for s in c['slides_data']:
            cards_html += f'''      <div class="slide-card">
        <div class="frame"><img loading="lazy" src="{s['file']}" alt="Slide {s['num']}"></div>
        <div class="info">
          <span class="slide-num">{int(s['num'])}/{c["slides"]}</span>
          <span class="slide-size">{s['size_kb']} KB</span>
        </div>
      </div>
'''
        cards_html += '    </div>\n  </div>\n'

    weeks = max(1, round(total_slides / 4))

    html = f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Preview Carruseles — Discover Rapa Nui</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    background: #0d0d0d;
    color: #eee;
    font-family: 'JetBrains Mono', monospace;
    padding: 40px 24px;
  }}
  .container {{ max-width: 1200px; margin: 0 auto; }}
  h1 {{ font-family: 'Playfair Display', serif; font-size: 2.4rem; color: #d4a853; text-align: center; }}
  .sub {{ text-align: center; color: #666; font-size: 0.75rem; margin-bottom: 8px; letter-spacing: 1px; }}
  .sub a {{ color: #d4a853; text-decoration: none; border-bottom: 1px solid #d4a85333; }}
  .sub a:hover {{ border-color: #d4a853; }}

  .stats {{ display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin: 32px 0 40px; }}
  .stat {{ background: #141414; border: 1px solid #222; padding: 20px 12px; text-align: center; }}
  .stat .num {{ font-family: 'Playfair Display', serif; font-size: 1.8rem; color: #d4a853; }}
  .stat .lbl {{ font-size: 0.6rem; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }}

  .nav {{ display: flex; gap: 8px; margin-bottom: 32px; flex-wrap: wrap; justify-content: center; }}
  .nav a {{ color: #888; text-decoration: none; font-size: 0.7rem; padding: 6px 14px; border: 1px solid #222; transition: 0.3s; letter-spacing: 0.5px; }}
  .nav a:hover {{ color: #d4a853; border-color: #d4a853; }}

  .carousel-section {{ margin-bottom: 64px; border-top: 1px solid #1a1a1a; padding-top: 32px; }}
  .carousel-header {{ display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }}
  .carousel-emoji {{ font-size: 1.4rem; }}
  .carousel-header h2 {{ font-family: 'Playfair Display', serif; font-size: 1.3rem; color: #fff; }}
  .carousel-badge {{ background: #d4a853; color: #0d0d0d; padding: 2px 12px; font-size: 0.6rem; font-weight: 600; letter-spacing: 1px; }}
  .carousel-meta {{ color: #555; font-size: 0.7rem; margin-bottom: 20px; }}
  .carousel-meta span {{ margin-right: 20px; }}

  .slides-grid {{ display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; }}
  .slide-card {{ width: 250px; background: #141414; border: 1px solid #222; border-radius: 6px; overflow: hidden; transition: 0.2s; }}
  .slide-card:hover {{ transform: translateY(-3px); box-shadow: 0 6px 24px rgba(0,0,0,0.5); border-color: #d4a85344; }}
  .slide-card .frame {{ width: 100%; aspect-ratio: 1080/1350; background: #1a1a1a; overflow: hidden; }}
  .slide-card .frame img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
  .slide-card .info {{ padding: 8px 10px; display: flex; justify-content: space-between; font-size: 0.65rem; color: #555; }}
  .slide-card .slide-num {{ font-weight: 600; color: #d4a853; }}

  .mock-feed {{ display: none; }}

  @media (max-width: 640px) {{
    .slide-card {{ width: 100%; max-width: 320px; }}
    .stats {{ grid-template-columns: repeat(2,1fr); }}
  }}
</style>
</head>
<body>
<div class="container">

<h1>Discover Rapa Nui</h1>
<p class="sub">Carruseles para Instagram · Mayo 2026<br>
<a href="#" onclick="document.querySelector('.mock-feed').style.display=document.querySelector('.mock-feed').style.display==='none'?'block':'none';return false">📱 Vista Instagram Feed</a></p>

<div class="stats">
  <div class="stat"><div class="num">{len(carousels)}</div><div class="lbl">Carruseles</div></div>
  <div class="stat"><div class="num">{total_slides}</div><div class="lbl">Slides</div></div>
  <div class="stat"><div class="num">~{weeks}</div><div class="lbl">Semanas contenido</div></div>
  <div class="stat"><div class="num">4</div><div class="lbl">Templates</div></div>
</div>

<div class="nav">
{nav_html}</div>

<div id="carousels">
{cards_html}</div>

</div>
</body>
</html>'''

    out_path = os.path.join(BASE, 'preview.html')
    with open(out_path, 'w') as f:
        f.write(html)
    print(f'✅ Preview generada: {out_path}')
    print(f'   {len(carousels)} carruseles · {total_slides} slides')

if __name__ == '__main__':
    build()
