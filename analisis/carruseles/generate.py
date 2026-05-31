#!/usr/bin/env python3
"""
Discover Rapa Nui — Generador de Carruseles Premium para Instagram
Diseño: 1080x1350 px (4:5) | Bodoni 72 + SFNS | Paleta: carbón, terracota, oro, arena
"""

import os, textwrap, math, json
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

# ── Rutas ──
BASE = os.path.expanduser("~/discover-rapanui/analisis")
FOTOS = os.path.join(BASE, "fotos") if os.path.isdir(os.path.join(BASE, "fotos")) else os.path.join(os.path.expanduser("~/discover-rapanui/frontend/assets/images"))
OUT = os.path.join(BASE, "carruseles", "output")
FONT_DIR = "/System/Library/Fonts"

os.makedirs(OUT, exist_ok=True)

# ── Colores ──
BLACK   = (15, 15, 15)
CHARCOAL= (26, 26, 26)
DARK    = (42, 42, 42)
TERRA   = (200, 90, 60)   # #c85a3c
TERRA_D = (168, 71, 46)
GOLD    = (212, 168, 83)  # #d4a853
GOLD_L  = (232, 201, 122)
SAND    = (245, 240, 232) # #f5f0e8
CREAM   = (250, 247, 242)
TEAL    = (42, 125, 122)
WHITE   = (255, 255, 255)
OFF_W   = (240, 238, 232)
TEXT_L  = (107, 107, 107)

# ── Fuentes ──
def font(path, size):
    try: return ImageFont.truetype(path, size)
    except: return ImageFont.load_default()

BODONI   = os.path.join(FONT_DIR, "Supplemental", "Bodoni 72 Smallcaps Book.ttf")
GEORGIA  = os.path.join(FONT_DIR, "Supplemental", "Georgia.ttf")
GEORGIA_B= os.path.join(FONT_DIR, "Supplemental", "Georgia Bold.ttf")
DIN_BOLD = os.path.join(FONT_DIR, "Supplemental", "DIN Alternate Bold.ttf")
SFNS     = os.path.join(FONT_DIR, "SFNS.ttf")
SFNS_BOLD= os.path.join(FONT_DIR, "SFNS.ttf")  # SFNS no tiene bold separado

F_H1   = lambda: font(BODONI, 82)
F_H2   = lambda: font(BODONI, 56)
F_H3   = lambda: font(BODONI, 42)
F_H4   = lambda: font(BODONI, 32)
F_BODY = lambda: font(SFNS, 24)
F_BODY_S= lambda: font(SFNS, 20)
F_META = lambda: font(SFNS, 16)
F_TINY = lambda: font(SFNS, 13)
F_DIN  = lambda: font(DIN_BOLD, 18)
F_NUM  = lambda: font(BODONI, 100)

# ── Imágenes disponibles ──
def get_images():
    exts = ('.jpg','.jpeg','.png')
    files = sorted([os.path.join(FOTOS,f) for f in os.listdir(FOTOS) if f.lower().endswith(exts)], key=lambda f: -os.path.getsize(f))
    return files if files else []

IMGS = get_images()

def pick_img(idx=0):
    if not IMGS: return None
    return IMGS[idx % len(IMGS)]

# ── Utilidades gráficas ──
def new_canvas():
    return Image.new('RGB', (1080, 1350), CHARCOAL)

def draw_gradient(draw, rect, c1, c2, vertical=True):
    x1,y1,x2,y2 = rect
    steps = 120
    for i in range(steps):
        r = c1[0] + (c2[0]-c1[0])*i//steps
        g = c1[1] + (c2[1]-c1[1])*i//steps
        b = c1[2] + (c2[2]-c1[2])*i//steps
        if vertical:
            y = y1 + (y2-y1)*i//steps
            draw.line([(x1,y),(x2,y)], fill=(r,g,b), width=1)
        else:
            x = x1 + (x2-x1)*i//steps
            draw.line([(x,y1),(x,y2)], fill=(r,g,b), width=1)

def add_photo_bg(img, photo_path, overlay=(0,0,0,80)):
    """Place photo as background with overlay"""
    try:
        photo = Image.open(photo_path).convert('RGB')
        photo = photo.resize((1080, 1350), Image.LANCZOS)
        img.paste(photo, (0,0))
        # overlay
        if overlay:
            r,g,b,a = overlay
            ol = Image.new('RGBA', (1080, 1350), (r,g,b,a))
            img = Image.alpha_composite(img.convert('RGBA'), ol).convert('RGB')
        return img
    except:
        # fallback gradient
        d = ImageDraw.Draw(img)
        draw_gradient(d, (0,0,1080,1350), CHARCOAL, DARK)
        return img

def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    line = ''
    for w in words:
        test = line + ' ' + w if line else w
        bbox = draw.textbbox((0,0), test, font=font)
        ww = bbox[2] - bbox[0]
        if ww <= max_width:
            line = test
        else:
            lines.append(line)
            line = w
    if line: lines.append(line)
    return lines

def text_block(draw, text, font, color, xy, max_width, line_spacing=8, align='left'):
    lines = wrap_text(text, font, max_width, draw)
    x, y = xy
    for line in lines:
        bbox = draw.textbbox((0,0), line, font=font)
        lh = bbox[3] - bbox[1] + line_spacing
        if align == 'center':
            tw = bbox[2] - bbox[0]
            draw.text((x + (max_width-tw)//2, y), line, fill=color, font=font)
        else:
            draw.text((x, y), line, fill=color, font=font)
        y += lh
    return y

# ── Slide builders ──

def slide_cover(title, subtitle="DISCOVER RAPA NUI", photo_idx=0, cta=None):
    """Slide 1 — Hook / Cover"""
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    if IMGS:
        img = add_photo_bg(img, pick_img(photo_idx), (0,0,0,70))
        draw = ImageDraw.Draw(img)
    else:
        draw_gradient(draw, (0,0,1080,1350), CHARCOAL, BLACK)
    # Top brand line
    draw.text((60, 60), "DISCOVER RAPA NUI", fill=GOLD, font=F_TINY())
    # Gold accent line
    draw.rectangle([(60, 88), (260, 90)], fill=GOLD)
    # Title
    y = 600
    for line in title.split('\n'):
        draw.text((60, y), line, fill=WHITE, font=F_H1())
        y += 100
    # Subtitle
    if subtitle:
        draw.text((60, y+20), subtitle, fill=OFF_W, font=F_BODY())
    if cta:
        bbox = draw.textbbox((0,0), cta, font=F_DIN())
        tw = bbox[2]-bbox[0]
        bx, by = 60, 1240
        draw.rectangle([(bx-10, by-8), (bx+tw+30, by+48)], outline=GOLD, width=2)
        draw.text((bx+10, by+10), cta, fill=GOLD, font=F_DIN())
    # Slide indicator
    return img

def slide_photo(title, text_lines, photo_idx=0, align='left'):
    """Full-bleed photo + text overlay"""
    img = new_canvas()
    if IMGS:
        img = add_photo_bg(img, pick_img(photo_idx), (0,0,0,65))
        draw = ImageDraw.Draw(img)
    else:
        draw = ImageDraw.Draw(img)
        draw_gradient(draw, (0,0,1080,1350), CHARCOAL, DARK)
    # Thin top accent
    draw.rectangle([(0,0),(1080,3)], fill=GOLD)
    if align == 'center':
        text_block(draw, title, F_H2(), WHITE, (80, 500), 920, 12, 'center')
        y = 660
        for t in text_lines:
            y = text_block(draw, t, F_BODY(), OFF_W, (120, y), 840, 6, 'center')
            y += 16
    else:
        text_block(draw, title, F_H2(), WHITE, (60, 500), 920, 12)
        y = 660
        for t in text_lines:
            y = text_block(draw, t, F_BODY(), OFF_W, (60, y), 920, 6)
            y += 12
    return img

def slide_text_only(title, body_lines, accent_color=GOLD, bg=CHARCOAL):
    """Clean text slide — for tips, lists"""
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Diagonal accent
    draw_gradient(draw, (0,0,1080,1350), bg, (20,20,20))
    draw.rectangle([(0,0),(1080,3)], fill=accent_color)
    draw.text((60, 60), "DISCOVER RAPA NUI", fill=GOLD, font=F_TINY())
    if not title.startswith('•'):
        text_block(draw, title, F_H2(), WHITE, (60, 200), 960, 12)
        y = 360
    else:
        y = 200
    for t in body_lines:
        is_header = t.startswith('✨') or t.startswith('📸') or t.startswith('🎵') or t.startswith('🌺') or t.startswith('🍽') or t.startswith('🏡') or t.startswith('💍')
        f = F_BODY_S() if not is_header else F_H4()
        c = WHITE if not is_header else GOLD
        if t.startswith('▸'):
            text_block(draw, t, F_BODY_S(), OFF_W, (80, y), 940, 6)
            y += 36
        elif t.startswith('→'):
            text_block(draw, t, F_BODY(), GOLD, (60, y), 960, 6)
            y += 42
        else:
            y = text_block(draw, t, f, c, (60, y), 960, 8)
            y += 20
    return img

def slide_quote(quote, author, role, photo_idx=0):
    """Testimonial-style quote slide"""
    img = new_canvas()
    if IMGS:
        img = add_photo_bg(img, pick_img(photo_idx), (0,0,0,78))
        draw = ImageDraw.Draw(img)
    else:
        draw = ImageDraw.Draw(img)
        draw_gradient(draw, (0,0,1080,1350), CHARCOAL, DARK)
    # Big quote mark
    draw.text((60, 200), '"', fill=GOLD, font=font(BODONI, 200))
    # Quote
    text_block(draw, quote, F_H3(), WHITE, (100, 360), 880, 16)
    # Author
    draw.text((100, 1000), author, fill=GOLD, font=F_H4())
    draw.text((100, 1050), role, fill=OFF_W, font=F_BODY_S())
    # Line accent
    draw.rectangle([(100, 1100), (260, 1102)], fill=GOLD)
    return img

def slide_cta(headline, body, btn_text="RESERVAR AHORA"):
    """Call to action final slide"""
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    draw_gradient(draw, (0,0,1080,1350), CHARCOAL, BLACK)
    draw.rectangle([(0,0),(1080,3)], fill=GOLD)
    draw.text((60, 60), "DISCOVER RAPA NUI", fill=GOLD, font=F_TINY())
    text_block(draw, headline, F_H1(), WHITE, (60, 400), 960, 14)
    text_block(draw, body, F_BODY(), OFF_W, (60, 620), 960, 8)
    # CTA Button
    bx, by = 60, 900
    bbox = draw.textbbox((0,0), btn_text, font=F_DIN())
    bw = (bbox[2]-bbox[0]) + 60
    draw.rectangle([(bx, by), (bx+bw, by+56)], fill=GOLD)
    draw.text((bx+30, by+16), btn_text, fill=BLACK, font=F_DIN())
    # Social links
    draw.text((60, 1200), "📷 @discover.rapanui", fill=TEXT_L, font=F_META())
    draw.text((60, 1230), "🌐 discoverrapanui.cl", fill=TEXT_L, font=F_META())
    return img

def slide_before_after(photo1_idx, photo2_idx, label1="Antes", label2="Después"):
    """Split screen before/after"""
    img = Image.new('RGB', (1080, 1350), CHARCOAL)
    draw = ImageDraw.Draw(img)
    # Two photos side by side
    try:
        p1 = Image.open(pick_img(photo1_idx)).convert('RGB').resize((540, 1200), Image.LANCZOS)
        p2 = Image.open(pick_img(photo2_idx)).convert('RGB').resize((540, 1200), Image.LANCZOS)
        img.paste(p1, (0, 75))
        img.paste(p2, (540, 75))
    except: pass
    draw = ImageDraw.Draw(img)
    # Labels
    draw.rectangle([(0,0),(1080,75)], fill=CHARCOAL)
    draw.text((200, 22), label1, fill=WHITE, font=F_H4())
    draw.text((740, 22), label2, fill=WHITE, font=F_H4())
    # Divider
    draw.line([(540, 75), (540, 1275)], fill=GOLD, width=2)
    return img

def add_slide_numbering(img, current, total):
    """Add slide counter like 3/10"""
    draw = ImageDraw.Draw(img)
    num = f"{current}/{total}"
    draw.text((980, 1290), num, fill=TEXT_L, font=F_TINY())

def save_carousel(slides, name):
    """Save all slides as JPEG"""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dirname = f"{ts}_{name}"
    outdir = os.path.join(OUT, dirname)
    os.makedirs(outdir, exist_ok=True)
    for i, slide in enumerate(slides):
        # Add numbering
        add_slide_numbering(slide, i+1, len(slides))
        path = os.path.join(outdir, f"slide_{i+1:02d}.jpg")
        slide.save(path, "JPEG", quality=92)
    # Save metadata
    meta = {
        "carousel": name,
        "date": ts,
        "slides": len(slides),
        "files": [f"slide_{i+1:02d}.jpg" for i in range(len(slides))]
    }
    with open(os.path.join(outdir, "_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print(f"  ✓ {name}: {len(slides)} slides → {outdir}")
    return outdir

# ══════════════════════════════════════════════════════
#  CARRUSELES
# ══════════════════════════════════════════════════════

def carrusel_destino():
    """
    Tipo: Inspiracional / Photo Dump
    Narrativa: Un día en Rapa Nui → de amanecer a atardecer
    """
    slides = []
    n = 9

    # 1 — Cover
    s = slide_cover(
        "Un día en\nRapa Nui",
        "La isla donde el tiempo se detiene · Ven y descúbrela",
        photo_idx=0
    )
    slides.append(s)

    # 2-7 — Photo series with minimal text
    moments = [
        ("Amanecer en Tongariki", "Los primeros rayos iluminan los moai. Un espectáculo que solo Rapa Nui puede ofrecer.", 1),
        ("El susurro del Pacífico", "Acantilados volcánicos, aguas infinitas. La naturaleza en su estado más puro.", 2),
        ("El corazón de la isla", "Rano Raraku, la cantera de los moai. Aquí nació la historia.", 3),
        ("Atardecer en Anakena", "Arena blanca, palmeras y el sol cayendo sobre el Pacífico. Magia pura.", 4),
        ("Cultura viva", "La música, la danza y el canto Rapa Nui siguen latiendo en cada ceremonia.", 5),
        ("Estrellas sobre Rapa Nui", "El cielo más limpio del hemisferio sur. Un regalo para los que miran arriba.", 6),
    ]
    for i, (title, desc, pidx) in enumerate(moments):
        s = slide_photo(title, [desc], photo_idx=pidx, align='center')
        slides.append(s)

    # 8 — Quote
    s = slide_quote(
        "Rapa Nui no es un destino. Es un lugar al que pertenece el alma.",
        "— Discover Rapa Nui",
        "Isla de Pascua · Chile",
        photo_idx=7
    )
    slides.append(s)

    # 9 — CTA
    s = slide_cta(
        "¿Listos para\nsu historia aquí?",
        "Coordinen su experiencia soñada con nosotros. Ceremonias, tours, hospedaje y más."
    )
    slides.append(s)

    save_carousel(slides, "destino_inspiracional")
    return slides


def carrusel_planes():
    """
    Tipo: Educativo / Servicios
    Muestra los dos planes sin precios, con servicio destacado
    """
    slides = []
    n = 10

    # 1 — Cover
    s = slide_cover(
        "Dos formas de\ncelebrar el amor",
        "Elopement Íntimo · Boda Completa — Elige la que resuene con ustedes",
        photo_idx=2,
        cta="DESCUBRE LOS PLANES →"
    )
    slides.append(s)

    # 2 — Intro
    s = slide_text_only(
        "Cada pareja es única",
        ["En Discover Rapa Nui diseñamos cada ceremonia a medida.",
         "Sin paquetes rígidos. Sin presiones. Solo una experiencia creada para ustedes.",
         "",
         "→ Trabajamos con proveedores locales certificados",
         "→ Coordinación integral desde Chile o el extranjero",
         "→ Ceremonias con respeto y autenticidad cultural"]
    )
    slides.append(s)

    # 3-4 — Plan Elopement
    s = slide_photo(
        "Plan Elopement",
        ["Para dos. Para siempre.",
         "Una ceremonia íntima, privada, en las locaciones más mágicas de la isla.",
         "Ideal para parejas que buscan autenticidad sin perder la magia."],
        photo_idx=3
    )
    slides.append(s)

    s = slide_text_only(
        "Elopement Íntimo — Incluye",
        ["💍 Ceremonia simbólica o ancestral Rapa Nui",
         "🌺 Maestro de ceremonia local (koro)",
         "📸 Fotografía profesional (sesión completa)",
         "🎥 Video documental (3 min)",
         "🥂 Brindis de bienvenida con espumante",
         "🌸 Arreglo floral nativo",
         "🚗 Traslado novios a locación",
         "✨ Coordinación logística completa"],
        accent_color=TERRA
    )
    slides.append(s)

    # 5-6 — Plan Completo
    s = slide_photo(
        "Plan Boda Completa",
        ["Todo lo del Elopement, elevado al máximo.",
         "Para celebrar con familiares y amigos en un evento inolvidable.",
         "Coordinación integral desde el primer contacto hasta el último invitado."],
        photo_idx=0
    )
    slides.append(s)

    s = slide_text_only(
        "Boda Completa — Incluye",
        ["💍 Ceremonia civil + ancestral",
         "🍽 Banquete con gastronomía local e internacional",
         "🎶 Música en vivo: grupo folclórico Rapa Nui",
         "🎧 Animación y sonido profesional",
         "🍸 Coctelería y barra de tragos",
         "🎂 Pastel de bodas personalizado",
         "📸 Sesión post-boda en locaciones icónicas",
         "🎥 Video documental extendido (8-10 min)",
         "💄 Maquillaje y peluquería para novia",
         "🚐 Traslados para novios e invitados",
         "👤 Coordinación day-of completa"],
        accent_color=GOLD
    )
    slides.append(s)

    # 7 — Valor variable
    s = slide_text_only(
        "¿Cuánto cuesta?",
        ["Nuestros planes se cotizan según:",
         "",
         "▸ Cantidad de invitados",
         "▸ Temporada del año",
         "▸ Locaciones seleccionadas",
         "▸ Servicios adicionales",
         "",
         "→ Contáctanos para una cotización personalizada",
         "→ Sin compromiso, con toda la transparencia"],
        accent_color=TEAL,
        bg=(20,30,30)
    )
    slides.append(s)

    # 8 — Testimonial break
    s = slide_quote(
        "Superó todas nuestras expectativas. Cada detalle fue cuidado con tanto cariño que solo nos quedó disfrutar.",
        "— María & Pablo",
        "Boda Completa · Santiago, Chile",
        photo_idx=5
    )
    slides.append(s)

    # 9 — Add-ons
    s = slide_text_only(
        "Agrega a tu plan",
        ["🏡 Hospedaje boutique en cabañas con vista al mar",
         "🗿 Tours guiados por Rapa Nui (Full Day / Media Jornada)",
         "🌅 Sesión de fotos al atardecer en Tahai",
         "🍽 Cena típica Rapa Nui con música en vivo",
         "🚁 Experiencia en helicóptero sobre la isla",
         "",
         "Todo se puede coordinar para que ustedes solo disfruten."],
        accent_color=TERRA
    )
    slides.append(s)

    # 10 — CTA
    s = slide_cta(
        "Planifiquemos\nsu experiencia",
        "Escríbanos por WhatsApp o Instagram y les enviaremos una propuesta en 48 horas."
    )
    slides.append(s)

    save_carousel(slides, "planes_servicios")
    return slides


def carrusel_tips():
    """
    Tipo: Educativo / Tips
    7 tips para organizar una boda en Rapa Nui
    """
    slides = []
    n = 10

    # 1 — Cover
    s = slide_cover(
        "7 tips para tu\nboda en Rapa Nui",
        "Guía práctica para organizar la ceremonia de tus sueños en la isla",
        photo_idx=4,
        cta="GUARDAR PARA DESPUÉS"
    )
    slides.append(s)

    # 2 — Intro
    s = slide_text_only(
        "Organizar una boda desde lejos\npuede parecer abrumador.",
        ["Pero con la información correcta y un equipo local, todo fluye.",
         "",
         "Aquí los 7 tips esenciales para que tu experiencia sea perfecta."],
        accent_color=GOLD
    )
    slides.append(s)

    # 3-9 — Tips
    tips = [
        ("1. Reserva con 6 meses de anticipación", 
         ["La isla tiene capacidad limitada de vuelos y alojamiento.",
          "En temporada alta (dic-mar) los cupos se agotan rápido.",
          "",
          "→ Recomendación: reserva tu fecha al menos 6 meses antes.",
          "→ Si es temporada alta, hasta 12 meses de anticipación."],
         TERRA),
        ("2. Elige el tipo de ceremonia", 
         ["¿Civil, ancestral o ambas?",
          "",
          "La ceremonia ancestral (Hanga Tuai) es simbólica y no tiene validez legal.",
          "Para el matrimonio civil, necesitas gestionar la hora en el Registro Civil.",
          "",
          "→ Nosotros coordinamos ambos trámites por ti."],
         GOLD),
        ("3. Considera a tus invitados", 
         ["Rapa Nui se vuelve parte de la experiencia de tus invitados.",
          "",
          "▸ Vuelo SCL → IPC: ~5 horas",
          "▸ Hospedaje: cabañas, hoteles o casas boutique",
          "▸ Actividades: tours, playas, gastronomía local",
          "",
          "→ Podemos armar un itinerario grupal para tus invitados."],
         TEAL),
        ("4. Clima y temporada", 
         ["Rapa Nui tiene clima subtropical. Templado todo el año.",
          "",
          "▸ Temporada alta (mejor clima): Dic-Mar",
          "▸ Temporada media: Abr-Jun / Sep-Nov",
          "▸ Temporada baja: Jul-Ago",
          "",
          "→ Las puestas de sol son espectaculares todo el año.",
          "→ Enero-Febrero son los meses más concurridos."],
         TERRA),
        ("5. Presupuesta con margen", 
         ["El valor de una boda destino incluye más que la ceremonia.",
          "",
          "▸ Vuelos y hospedaje (novios e invitados)",
          "▸ Alimentación y actividades",
          "▸ Traslados en la isla",
          "▸ Vestuario, argollas, detalles",
          "",
          "→ Te ayudamos a presupuestar cada partida sin sorpresas."],
         GOLD),
        ("6. Documentación al día", 
         ["Para la ceremonia civil necesitas:",
          "",
          "▸ Pasaporte o cédula vigente",
          "▸ Certificado de nacimiento (menos de 60 días)",
          "▸ Si hay divorcio: escritura de divorcio inscrita",
          "▸ 2 testigos con sus documentos",
          "",
          "→ Para la ancestral: solo amor y ganas de celebrar."],
         TEAL),
        ("7. Confía en un equipo local", 
         ["Un organizador local marca la diferencia:",
          "",
          "▸ Conexión directa con proveedores de confianza",
          "▸ Gestión de permisos Mau Henua (Parque Nacional)",
          "▸ Coordinación en terreno el día del evento",
          "▸ Resolución de imprevistos en tiempo real",
          "",
          "→ Nosotros vivimos en la isla. No estamos a 3.700 km."],
         TERRA),
    ]
    for tip_title, tip_body, accent in tips:
        s = slide_text_only(tip_title, tip_body, accent_color=accent, bg=CHARCOAL)
        slides.append(s)

    # 10 — CTA
    s = slide_cta(
        "¿Listos para\nempezar?",
        "Guarden este carrusel y escríbanos cuando quieran conversar su proyecto.",
        btn_text="ENVIAR MENSAJE →"
    )
    slides.append(s)

    save_carousel(slides, "tips_boda")
    return slides


def carrusel_testimonios():
    """
    Tipo: Social Proof / Testimonios
    Parejas reales compartiendo su experiencia
    """
    slides = []
    n = 8

    # 1 — Cover
    s = slide_cover(
        "Lo que dicen\nnuestras parejas",
        "Historias reales de amor en Rapa Nui",
        photo_idx=1,
        cta="VER TESTIMONIOS →"
    )
    slides.append(s)

    # 2 — Trust intro
    s = slide_text_only(
        "Más de 15 años creando\nmomentos únicos",
        ["Detrás de cada ceremonia hay una historia. Conoce lo que dicen quienes ya vivieron la experiencia Discover Rapa Nui.",
         "",
         "→ +200 parejas atendidas",
         "→ 100% experiencias personalizadas",
         "→ Ceremonias en locaciones patrimoniales"],
        accent_color=GOLD
    )
    slides.append(s)

    # 3-6 — Testimonials
    testimonials = [
        ("Fue la experiencia más mágica de nuestras vidas. Desde la ceremonia ancestral hasta la cena en la playa, cada detalle fue perfecto. Viajamos desde Australia sin saber qué esperar y superó todo.",
         "Sarah & James", "Elopement · Sydney, Australia", 5),
        ("El equipo de Discover Rapa Nui hizo que todo fluyera sin estrés. Nuestras familias quedaron maravilladas con la organización. La ceremonia ancestral fue un momento que recordaremos por siempre.",
         "María & Pablo", "Boda Completa · Santiago, Chile", 3),
        ("Queríamos algo íntimo y diferente. Nos casamos al atardecer en Anakena con solo 8 invitados. Fue perfecto. La conexión con la cultura Rapa Nui le dio un significado que ninguna otra boda podría tener.",
         "Camila & Tomás", "Elopement · Buenos Aires, Argentina", 6),
        ("Contratamos la boda completa para 45 invitados. La logística desde el continente parecía compleja, pero ellos coordinaron absolutamente todo. Vuelos, cabañas, tours, comida... impecable.",
         "Los Andes & Familia", "Boda Completa · Santiago, Chile", 7),
    ]
    for quote, author, role, pidx in testimonials:
        s = slide_quote(quote, author, role, photo_idx=pidx)
        slides.append(s)

    # 7 — Numbers/stats
    s = slide_text_only(
        "✨ Discover Rapa Nui en cifras",
        ["🏆 Más de 15 años en la isla",
         "💑 +200 parejas de todo el mundo",
         "🌍 Clientes de Chile, Argentina, Brasil, EE.UU., Australia, Europa",
         "📸 Cobertura en revista La Tercera (2009)",
         "⭐ Reconocidos por autenticidad cultural",
         "",
         "→ Cada pareja es única. Cada ceremonia, también."],
        accent_color=GOLD
    )
    slides.append(s)

    # 8 — CTA
    s = slide_cta(
        "¿Quieren ser los\npróximos?",
        "Cuéntenos su historia y les enviaremos una propuesta personalizada.",
        btn_text="HABLEMOS →"
    )
    slides.append(s)

    save_carousel(slides, "testimonios")
    return slides


# ══════════════════════════════════════════════════════
#  EJECUCIÓN
# ══════════════════════════════════════════════════════

def generate_all():
    print(f"\n{'='*60}")
    print(f"  DISCOVER RAPA NUI — Generador de Carruseles")
    print(f"  Fotos fuente: {len(IMGS)} imágenes disponibles")
    print(f"  Output: {OUT}")
    print(f"{'='*60}\n")

    print("1/4 🏝️  Carrusel Destino (Inspiracional)")
    carrusel_destino()

    print("\n2/4 📋  Carrusel Planes (Servicios)")
    carrusel_planes()

    print("\n3/4 💡  Carrusel Tips (Educativo)")
    carrusel_tips()

    print("\n4/4 💬  Carrusel Testimonios (Social Proof)")
    carrusel_testimonios()

    print(f"\n{'='*60}")
    print(f"  ¡LISTO! 4 carruseles generados → {OUT}")
    print(f"  Total: 4 carruseles · ~36 slides")
    print(f"  Próximo paso: Subir manualmente a Instagram")
    print(f"{'='*60}")

def generate_one(name):
    """Generate a single carousel by name"""
    print(f"\nGenerando carrusel: {name}")
    mapper = {
        'destino': carrusel_destino,
        'planes': carrusel_planes,
        'tips': carrusel_tips,
        'testimonios': carrusel_testimonios,
    }
    fn = mapper.get(name.lower())
    if fn: fn()
    else: print(f"  ✗ No encontrado. Opciones: {list(mapper.keys())}")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        generate_one(sys.argv[1])
    else:
        generate_all()
