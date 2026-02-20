
import sys
import os
from PIL import Image

def add_logo(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        base_image = Image.open(input_path).convert("RGBA")
        
        # Determine logo path (assuming relative to this script)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        logo_path = os.path.join(script_dir, "../resources/Mosaic_Logo_Straight_Charcoal.png")
        
        if not os.path.exists(logo_path):
            print(f"Error: Logo not found at {logo_path}")
            return

        logo = Image.open(logo_path).convert("RGBA")

        # Resize logo to be 20% of the base image width
        target_width = int(base_image.width * 0.20)
        aspect_ratio = logo.height / logo.width
        target_height = int(target_width * aspect_ratio)
        
        logo = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)

        # Position: Bottom Right with 5% padding
        padding = int(base_image.width * 0.05)
        x = base_image.width - logo.width - padding
        y = base_image.height - logo.height - padding
        
        # Paste logo
        base_image.paste(logo, (x, y), logo)
        
        # Save
        if output_path.lower().endswith(".jpg") or output_path.lower().endswith(".jpeg"):
            base_image = base_image.convert("RGB")
            
        base_image.save(output_path)
        print(f"Saved branded image to {output_path}")

    except Exception as e:
        print(f"Error adding logo: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python add_logo.py <input_image> <output_image>")
        sys.exit(1)
        
    input_img = sys.argv[1]
    output_img = sys.argv[2]
    add_logo(input_img, output_img)
