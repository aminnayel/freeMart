try:
    from PIL import Image
    import os
    
    path = r"C:\Users\LAPTOP SHOP\.gemini\antigravity\scratch\EnchantedSecrets\client\public\logo.png"
    if os.path.exists(path):
        img = Image.open(path)
        print(f"Original size: {img.size}")
        if img.width > 512:
            ratio = 512 / img.width
            new_height = int(img.height * ratio)
            img = img.resize((512, new_height), Image.Resampling.LANCZOS)
            img.save(path, optimize=True, quality=85)
            print(f"Resized to: {img.size}")
        else:
            print("Image small enough, skipping resize.")
            img.save(path, optimize=True, quality=85)
            print("Optimized existing image.")
except ImportError:
    print("Pillow not installed")
except Exception as e:
    print(f"Error: {e}")
