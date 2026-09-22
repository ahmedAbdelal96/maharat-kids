"""Generate original, multi-page Maharat Kids demo workbooks.

The files are intentionally generated locally and are later uploaded through the
MK-10 PRIVATE_ASSET boundary by seed-demo-catalog.ts. They contain no competitor
copy or third-party pages.
"""

from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "seed-assets" / "demo-source" / "digital"
OUT.mkdir(parents=True, exist_ok=True)
W, H = A4
FONT = "Tahoma"
FONT_BOLD = "Tahoma-Bold"
pdfmetrics.registerFont(TTFont(FONT, r"C:\Windows\Fonts\tahoma.ttf"))
pdfmetrics.registerFont(TTFont(FONT_BOLD, r"C:\Windows\Fonts\tahomabd.ttf"))

NAVY = colors.HexColor("#12324a")
TEAL = colors.HexColor("#1c8a93")
GOLD = colors.HexColor("#f2b84b")
CORAL = colors.HexColor("#ef7d68")
PALE = colors.HexColor("#f4f8f7")


def rtl(text: str) -> str:
    return get_display(arabic_reshaper.reshape(text))


def text(c: canvas.Canvas, value: str, x: float, y: float, size: int = 14, color=NAVY, bold=False, align="left"):
    c.setFont(FONT_BOLD if bold else FONT, size)
    c.setFillColor(color)
    if any("\u0600" <= ch <= "\u06ff" for ch in value):
        value = rtl(value)
    if align == "center":
        c.drawCentredString(x, y, value)
    elif align == "right":
        c.drawRightString(x, y, value)
    else:
        c.drawString(x, y, value)


def header(c: canvas.Canvas, title_ar: str, title_en: str, page: int, total: int, accent=TEAL):
    c.setFillColor(PALE)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(accent)
    c.rect(0, H - 72, W, 72, fill=1, stroke=0)
    text(c, "مهارة طفل", W - 42, H - 30, 19, colors.white, True, "right")
    text(c, "Maharat Kids", 42, H - 30, 14, colors.white, True)
    text(c, title_ar, W - 42, H - 54, 11, colors.white, False, "right")
    text(c, title_en, 42, H - 54, 10, colors.white)
    c.setStrokeColor(colors.HexColor("#d9e7e4"))
    c.line(42, 40, W - 42, 40)
    text(c, "نتعلم • نلعب • نتطور", W - 42, 22, 9, TEAL, True, "right")
    text(c, f"{page} / {total}", 42, 22, 9, TEAL)


def cover(c: canvas.Canvas, ar: str, en: str, subtitle: str, accent=TEAL):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(accent)
    c.circle(W - 72, H - 96, 120, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.circle(54, 90, 85, fill=1, stroke=0)
    text(c, "مهارة طفل", W / 2, H - 150, 30, colors.white, True, "center")
    text(c, "Maharat Kids", W / 2, H - 190, 18, colors.white, True, "center")
    text(c, ar, W / 2, H - 330, 25, colors.white, True, "center")
    text(c, en, W / 2, H - 375, 18, colors.white, True, "center")
    text(c, subtitle, W / 2, H - 430, 12, colors.HexColor("#d9f1ed"), False, "center")
    c.setFillColor(colors.white)
    c.roundRect(72, 145, W - 144, 115, 18, fill=0, stroke=1)
    text(c, "Original activity workbook", W / 2, 222, 14, colors.white, True, "center")
    text(c, "Ages 3–6  |  Print, play, and learn together", W / 2, 190, 11, colors.HexColor("#d9f1ed"), False, "center")
    text(c, "This book supports playful learning activities. It is not a medical treatment.", W / 2, 164, 8, colors.HexColor("#d9f1ed"), False, "center")


def card(c: canvas.Canvas, x: float, y: float, w: float, h: float, label: str, fill=colors.white, accent=TEAL):
    c.setFillColor(fill)
    c.setStrokeColor(colors.HexColor("#c8dedb"))
    c.roundRect(x, y, w, h, 12, fill=1, stroke=1)
    c.setFillColor(accent)
    c.circle(x + 22, y + h - 22, 8, fill=1, stroke=0)
    text(c, label, x + 40, y + h - 28, 11, NAVY, True)


def draw_focus(c: canvas.Canvas):
    ar, en = "كتاب أنشطة التركيز والانتباه", "Attention & Focus Activity Book"
    total = 13
    cover(c, ar, en, "أنشطة قصيرة للملاحظة والمطابقة والتسلسل", TEAL); c.showPage()
    pages = [
        ("أبحث عن المختلف", "Find the different item", ["● ● ● ▲", "★ ★ ● ★", "■ ■ ■ ●"]),
        ("طابق الشكل", "Match the shape", ["○     ○", "△     △", "□     □"]),
        ("أكمل النمط", "Complete the pattern", ["● ▲ ● ▲ ?", "■ ○ ■ ○ ?", "★ ★ ○ ★ ★ ?"]),
        ("تتبّع الطريق", "Follow the path", ["START  →  ○  →  △  →  FINISH"]),
        ("راقب التفاصيل", "Notice the details", ["Find 3 circles", "Find 2 triangles", "Find 4 stars"]),
        ("رتّب الخطوات", "Put in order", ["1. أستعد", "2. أرتب", "3. أبدأ"]),
        ("صنّف الأشياء", "Sort the items", ["طبيعة   |   أدوات   |   ألعاب"]),
        ("ذاكرة سريعة", "Quick memory", ["انظر 10 ثوانٍ ثم غطِّ البطاقة", "ما اللون الذي اختفى؟"]),
        ("متاهة الانتباه", "Attention maze", ["START  ┌──┐  ┌────┐", "      └──┴──┘  FINISH"]),
        ("اختر الإجابة", "Choose the answer", ["ما الذي يأتي بعد ● ▲ ● ؟", "أ) ▲    ب) ■    ج) ○"]),
        ("أكمل الصورة", "Complete the picture", ["ارسم النصف الآخر من الفراشة", "تذكّر: اجعل الجانبين متشابهين"]),
        ("تحدي الملاحظة", "Observation challenge", ["ضع دائرة حول الشيء الصغير", "ثم لوّن الشيء الكبير"]),
    ]
    for i, (a, e, rows) in enumerate(pages, 2):
        header(c, ar, en, i, total, TEAL)
        text(c, a, W - 48, H - 135, 22, NAVY, True, "right")
        text(c, e, 48, H - 135, 16, TEAL, True)
        for j, row in enumerate(rows):
            card(c, 58, H - 260 - j * 105, W - 116, 74, row, colors.white, GOLD if j % 2 else CORAL)
        text(c, "خذ وقتك، راجع إجابتك، واحتفل بالمحاولة.", W / 2, 90, 13, TEAL, True, "center")
        c.showPage()


def draw_prewrite(c: canvas.Canvas):
    ar, en = "كراسة التهيئة قبل الكتابة", "Pre-Writing Skills Workbook"
    total = 15
    cover(c, ar, en, "خطوط ومسارات وأشكال لتقوية التآزر البصري الحركي", CORAL); c.showPage()
    lessons = [
        ("خطوط أفقية", "Horizontal lines", "──────────────"),
        ("خطوط رأسية", "Vertical lines", "│  │  │  │  │  │"),
        ("خطوط مائلة", "Slanted lines", "////  \\\\  ////  \\\\"),
        ("منحنيات", "Curves", "∩  ∪  ∩  ∪  ∩"),
        ("موجات", "Waves", "~~~~ ~~~~ ~~~~"),
        ("دوائر", "Circles", "○   ○   ○   ○"),
        ("مربعات", "Squares", "□   □   □   □"),
        ("مثلثات", "Triangles", "△   △   △   △"),
        ("تتبّع المسار", "Trace the path", "● · · · · · · ★"),
        ("ارسم داخل الإطار", "Draw inside the frame", "┌────────────┐  │            │  └────────────┘"),
        ("اتبع الأسهم", "Follow the arrows", "→ → ↓ ↓ ← ← ↑ ↑"),
        ("خطوط صغيرة وكبيرة", "Small and large strokes", "—  ───  —  ───  —"),
        ("ارسم شكلًا من النقاط", "Join the dots", "1  •     2  •     3  •     4  •"),
        ("مسار الحديقة", "Garden path", "START  ~~~~  ○  ~~~~  FINISH"),
    ]
    for i, (a, e, art) in enumerate(lessons, 2):
        header(c, ar, en, i, total, CORAL)
        text(c, a, W - 48, H - 135, 22, NAVY, True, "right")
        text(c, e, 48, H - 135, 16, CORAL, True)
        c.setFillColor(colors.white); c.setStrokeColor(colors.HexColor("#c8dedb")); c.roundRect(54, 230, W - 108, 270, 18, fill=1, stroke=1)
        text(c, art, W / 2, 370, 22, NAVY, True, "center")
        text(c, "استخدم قلمًا مريحًا وحاول أن تبقى داخل المسار.", W / 2, 185, 13, CORAL, True, "center")
        c.showPage()


def draw_visual(c: canvas.Canvas):
    ar, en = "كتاب الإدراك البصري والمطابقة", "Visual Perception & Matching"
    total = 13
    cover(c, ar, en, "مطابقة وتمييز وتصنيف وأنماط مرئية", GOLD); c.showPage()
    lessons = [
        ("طابق المتشابه", "Match identical shapes", "●   ▲   ■        ▲   ■   ●"),
        ("طابق الظل", "Match the shadow", "★        ◇        ●        ؟  ؟  ؟"),
        ("كبير أم صغير؟", "Big or small?", "كبير:  ●●●●       صغير:  ●"),
        ("أين المختلف؟", "Find the odd one", "○ ○ ○ △ ○"),
        ("صنّف حسب اللون", "Sort by color", "أحمر | أزرق | أصفر"),
        ("أكمل النمط", "Complete the pattern", "▲ ■ ▲ ■ ?"),
        ("تذكّر المكان", "Remember the place", "ضع دائرة حول الشكل الذي كان في الزاوية"),
        ("متاهة الأشكال", "Shape maze", "○ → △ → □ → ★"),
        ("طابق العدد", "Match the quantity", "●●●       3"),
        ("ترتيب الأحجام", "Order by size", "صغير  →  متوسط  →  كبير"),
        ("تمييز الاتجاه", "Direction check", "→   ←   ↑   ↓"),
        ("صورة كاملة", "Whole picture", "أي قطعتين تكملان الصورة؟  1  2  3"),
    ]
    for i, (a, e, art) in enumerate(lessons, 2):
        header(c, ar, en, i, total, GOLD)
        text(c, a, W - 48, H - 135, 22, NAVY, True, "right")
        text(c, e, 48, H - 135, 16, colors.HexColor("#9d7218"), True)
        card(c, 60, 310, W - 120, 150, art, colors.white, GOLD)
        for j, label in enumerate(["أفكر", "أطابق", "أتحقق"]):
            card(c, 74 + j * 160, 160, 140, 70, label, colors.white, [TEAL, CORAL, GOLD][j])
        c.showPage()


def draw_concepts(c: canvas.Canvas):
    ar, en = "بطاقات المفاهيم الأساسية المصورة", "Basic Concepts Activity Book"
    total = 13
    cover(c, ar, en, "فوق وتحت، داخل وخارج، كبير وصغير، وأكثر", NAVY); c.showPage()
    lessons = [
        ("فوق / تحت", "Above / below", "فوق ▲     تحت ▼"),
        ("داخل / خارج", "Inside / outside", "[  ●  ]     ○"),
        ("كبير / صغير", "Big / small", "●●●●     ●"),
        ("طويل / قصير", "Long / short", "──────────     ───"),
        ("أمام / خلف", "In front / behind", "●  →  ▲  →  ■"),
        ("سريع / بطيء", "Fast / slow", "سريع      بطيء"),
        ("قريب / بعيد", "Near / far", "●   ●                 ●"),
        ("مفتوح / مغلق", "Open / closed", "□       ■"),
        ("أعلى / أسفل", "Top / bottom", "▲\n│\n▼"),
        ("ممتلئ / فارغ", "Full / empty", "[●●●]     [   ]"),
        ("متشابه / مختلف", "Same / different", "○ ○ ○     ○ △ ○"),
        ("اتبع التعليمات", "Follow the instruction", "ضع دائرة حول الشيء الموجود داخل الإطار"),
    ]
    for i, (a, e, art) in enumerate(lessons, 2):
        header(c, ar, en, i, total, NAVY)
        text(c, a, W - 48, H - 135, 22, NAVY, True, "right")
        text(c, e, 48, H - 135, 16, TEAL, True)
        c.setFillColor(colors.white); c.setStrokeColor(colors.HexColor("#c8dedb")); c.roundRect(60, 290, W - 120, 180, 18, fill=1, stroke=1)
        for line, row in enumerate(art.split("\n")):
            text(c, row, W / 2, 390 - line * 34, 26 if len(row) < 22 else 15, CORAL if line % 2 else NAVY, True, "center")
        text(c, "ارسم أو لوّن أو اختر الإجابة التي تمثل المفهوم.", W / 2, 190, 13, TEAL, True, "center")
        c.showPage()


def make(name: str, drawer):
    target = OUT / f"{name}.pdf"
    c = canvas.Canvas(str(target), pagesize=A4, pageCompression=1)
    drawer(c)
    c.save()
    print(target)


make("attention-focus-activity-book", draw_focus)
make("pre-writing-skills-workbook", draw_prewrite)
make("visual-perception-matching-workbook", draw_visual)
make("basic-concepts-activity-book", draw_concepts)
