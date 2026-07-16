import os
import sys
from collections import Counter
from PIL import Image

def get_dominant_colors(image_path, num_colors=3):
    try:
        img = Image.open(image_path)
        img = img.convert('RGB')
        
        # Resize for faster processing
        img.thumbnail((100, 100))
        
        # Get pixels and count them
        pixels = list(img.getdata())
        # Filter out white and near-white backgrounds
        filtered_pixels = [p for p in pixels if not (p[0] > 240 and p[1] > 240 and p[2] > 240)]
        
        if not filtered_pixels:
            filtered_pixels = pixels  # fallback if entirely white
            
        counter = Counter(filtered_pixels)
        dominant = counter.most_common(num_colors)
        
        hex_colors = ['#{:02x}{:02x}{:02x}'.format(r, g, b) for (r, g, b), count in dominant]
        return hex_colors
    except Exception as e:
        return [str(e)]

logos_dir = r"c:\Users\ADMIN\Desktop\ALL_HANDS\Ideallabs_automated\my-app\public\company_logos"
logos = ["WYN.jpg", "ICON.jpg", "IDIAS.jpg", "PROSUMMITS.jpg", "WYNXTALKS.jpg", "NEXT.jpg", "VOICE.jpg"]

for logo in logos:
    path = os.path.join(logos_dir, logo)
    if os.path.exists(path):
        colors = get_dominant_colors(path)
        print(f"{logo}: {colors}")
    else:
        print(f"{logo}: NOT FOUND at {path}")
