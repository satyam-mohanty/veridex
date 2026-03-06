import os

icons_dir = (
    r"d:\Desktop\Satyam\Hackathons\Reva Hackathon\V2\phishshield-extension\icons"
)
os.makedirs(icons_dir, exist_ok=True)

png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

for size in [16, 48, 128]:
    with open(os.path.join(icons_dir, f"icon{size}.png"), "wb") as f:
        f.write(png_data)

print("Icons created successfully.")
