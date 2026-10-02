#!/bin/bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Please install Node.js LTS first: https://nodejs.org"; read -n1 -p "Press any key"; exit 1; }
npm install && npm run dist:mac && { echo; echo 'Done. The .dmg is inside the "dist" folder'; open dist; }
read -n1 -p "Press any key to close"
