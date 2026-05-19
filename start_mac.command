#!/bin/bash
# Double-click this file on macOS to launch AstroVerse
cd "$(dirname "$0")"

PORTS=(8080 3000 3001 4000 9000)
find_free_port() {
  for port in "${PORTS[@]}"; do
    if ! lsof -i :"$port" &>/dev/null 2>&1; then echo "$port"; return; fi
  done
  echo "8080"
}

PORT=$(find_free_port)
export PORT=$PORT

echo "╔══════════════════════════════════════════╗"
echo "║        🌌  ASTROVERSE v5                 ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Port: $PORT"
echo "  Site:  http://localhost:$PORT"
echo "  Admin: http://localhost:$PORT/admin"
echo "  Login: admin / admin123"
echo ""

# Install Flask if missing
python3 -c "import flask" 2>/dev/null || pip3 install flask -q

# Open browser after 2 seconds
(sleep 2 && open "http://localhost:$PORT") &

python3 app.py
