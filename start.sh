#!/bin/bash
# ============================================================
#  AstroVerse v5 — Startup Script
# ============================================================

# Try ports in order until one is free
PORTS=(8080 3000 3001 4000 4001 9000)

find_free_port() {
  for port in "${PORTS[@]}"; do
    if ! lsof -i :"$port" &>/dev/null 2>&1; then
      echo "$port"
      return
    fi
  done
  echo "8080"  # fallback
}

PORT=$(find_free_port)
export PORT=$PORT

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║        🌌  ASTROVERSE v5                 ║"
echo "  ║   Astrophysics Education Platform        ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Starting on port $PORT..."
echo ""

# Install deps if needed
if ! python3 -c "import flask" &>/dev/null 2>&1; then
  echo "  📦 Installing Flask..."
  pip install flask --break-system-packages -q || pip install flask -q
fi

python3 app.py
