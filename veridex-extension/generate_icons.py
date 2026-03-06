import os
import sys


def generate_icons_pillow(icons_dir):
    from PIL import Image, ImageDraw, ImageFont

    sizes = [16, 48, 128]
    bg_color = "#0a0e1a"
    shield_color = "#00d4ff"
    text_color = "white"

    try:
        font_48 = ImageFont.truetype("arial.ttf", 20)
        font_128 = ImageFont.truetype("arial.ttf", 60)
        font_16 = ImageFont.load_default()
    except IOError:
        font_48 = ImageFont.load_default()
        font_128 = ImageFont.load_default()
        font_16 = ImageFont.load_default()

    fonts = {16: font_16, 48: font_48, 128: font_128}

    for size in sizes:
        img = Image.new("RGBA", (size, size), bg_color)
        draw = ImageDraw.Draw(img)

        
        margin = size // 6
        points = [
            (margin, margin),
            (size - margin, margin),
            (size - margin, size // 2),
            (size // 2, size - margin),
            (margin, size // 2),
        ]
        draw.polygon(points, fill=shield_color)

        
        text = "PS"
        font = fonts[size]
        try:
            
            bbox = draw.textbbox((0, 0), text, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
        except AttributeError:
            tw, th = draw.textsize(text, font=font)

        draw.text(
            ((size - tw) / 2, (size - th) / 2 - size // 12),
            text,
            font=font,
            fill=text_color,
        )

        img.save(os.path.join(icons_dir, f"icon{size}.png"))

    print("Icons generated successfully using Pillow.")


def generate_icons_tkinter(icons_dir):
    import tkinter as tk

    root = tk.Tk()
    sizes = [16, 48, 128]
    bg_color = "#0a0e1a"
    shield_color = "#00d4ff"
    text_color = "white"

    for size in sizes:
        canvas = tk.Canvas(
            root, width=size, height=size, bg=bg_color, highlightthickness=0
        )
        canvas.pack()

        margin = size // 6
        points = [
            margin,
            margin,
            size - margin,
            margin,
            size - margin,
            size // 2,
            size // 2,
            size - margin,
            margin,
            size // 2,
        ]
        canvas.create_polygon(points, fill=shield_color, outline=shield_color)

        fs = max(6, size // 3)
        canvas.create_text(
            size // 2, size // 2, text="PS", fill=text_color, font=("Arial", fs, "bold")
        )

        canvas.update()
        canvas.postscript(
            file=os.path.join(icons_dir, f"icon{size}.eps"), colormode="color"
        )
        canvas.destroy()

        
    root.destroy()
    raise Exception(
        "Tkinter PNG saving requires extra tools. Using Base64 fallback instead."
    )


def generate_icons_base64(icons_dir):
    import base64

   
    b64_16 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAK0lEQVR42mP8z8AARjwMA4Iww///P8nKwQoGBgYGXIAxGjZo2KBBwwYvAwB59wQz5X+JzwAAAABJRU5ErkJggg=="
    
    b64_48 = "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAANUlEQVR42u3PMQ0AAAgDILV/5tHxx8DgBTrZVHVycnJycnJycnJycnJycnJycnJycnJycrd7e1g2D3Wn0YcAAAAASUVORK5CYII="
    
    b64_128 = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAABlBMVEUKDhrw///tY1hOAAAAI0lEQVR42u3BAQEAAACAkP6v7ggKAAAAAAAAAAAAAAAAAABuBvAAAWSk17kAAAAASUVORK5CYII="

    sizes = [(16, b64_16), (48, b64_48), (128, b64_128)]
    for size, b64 in sizes:
        with open(os.path.join(icons_dir, f"icon{size}.png"), "wb") as f:
            f.write(base64.b64decode(b64))
    print("Icons generated using base64 fallback.")


if __name__ == "__main__":
    ext_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(ext_dir, "icons")

    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)

    try:
        generate_icons_pillow(icons_dir)
    except Exception as e:
        print(f"Pillow failed: {e}. Trying fallback...")
        try:
            generate_icons_base64(icons_dir)
        except Exception as e2:
            print(f"Fallback failed: {e2}")
