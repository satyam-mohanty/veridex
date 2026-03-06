
cd "$(dirname "$0")"

echo "Checking required files..."

for file in manifest.json background.js content.js popup/popup.html popup/popup.js popup/popup.css generate_icons.py; do
    if [ ! -f "$file" ]; then
        echo "Error: Required file $file is missing."
        exit 1
    fi
done

echo "Running generate_icons.py..."
python generate_icons.py

if [ ! -d "icons" ]; then
    echo "Error: icons directory is missing. Did generate_icons.py fail?"
    exit 1
fi

echo "Zipping the extension..."
cd ..
zip -r phishshield-extension.zip phishshield-extension/ -x "*/.git/*" "*/.DS_Store" "*/node_modules/*"

echo ""
echo "Extension packaged: ../phishshield-extension.zip"
echo "To install: Go to chrome://extensions -> Load unpacked -> select phishshield-extension/"
