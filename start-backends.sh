#!/bin/bash
# ============================================================
# Start whiteboard backend services
# Run this AFTER starting your Docker Postgres container:
#   bash /home/aditya/Projects/Zoom/start-backends.sh
# ============================================================

export DATABASE_URL="postgresql://postgres:MYSECRET@localhost:5432/zoomwhiteboard?schema=public"
export HTTP_BACKEND_PORT=3010
export WS_BACKEND_PORT=3011

PROJECT_DIR="/home/aditya/Projects/Zoom"

# Load nvm
source ~/.nvm/nvm.sh
nvm use 23 --silent

echo ""
echo "=================================================="
echo "  Zoom Whiteboard Backend Startup"
echo "=================================================="

# ── Step 1: Wait for Postgres to be ready ────────────────
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
MAX_RETRIES=15
RETRY=0
until pg_isready -h localhost -p 5432 -U postgres -q 2>/dev/null; do
    RETRY=$((RETRY+1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        echo "❌ PostgreSQL not reachable after ${MAX_RETRIES} attempts."
        echo "   Make sure your Docker container is running:"
        echo "   docker start <container-name>"
        echo "   or: docker run -d -e POSTGRES_PASSWORD=MYSECRET -p 5432:5432 postgres"
        exit 1
    fi
    echo "   Attempt $RETRY/$MAX_RETRIES — retrying in 2s..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

# ── Step 2: Push schema (creates tables if they don't exist) ─
echo ""
echo "📦 Syncing Prisma schema to database..."
cd "$PROJECT_DIR/packages/prisma"
DATABASE_URL="$DATABASE_URL" npx prisma db push --skip-generate 2>&1 | grep -E "(sync|error|Error|created|already|✓|🚀)" || true
echo "✅ Schema is up to date"

# ── Step 3: Kill any old instances on these ports ────────────
echo ""
echo "🧹 Cleaning up old processes on ports $HTTP_BACKEND_PORT and $WS_BACKEND_PORT..."
fuser -k ${HTTP_BACKEND_PORT}/tcp 2>/dev/null || true
fuser -k ${WS_BACKEND_PORT}/tcp 2>/dev/null || true
sleep 1

# ── Step 4: Start backends ───────────────────────────────────
echo ""
echo "🚀 Starting HTTP backend on port $HTTP_BACKEND_PORT..."
cd "$PROJECT_DIR/apps/http-backend-wb"
DATABASE_URL="$DATABASE_URL" HTTP_BACKEND_PORT=$HTTP_BACKEND_PORT node dist/index.js &
HTTP_PID=$!

echo "🚀 Starting WS backend on port $WS_BACKEND_PORT..."
cd "$PROJECT_DIR/apps/ws-backend-wb"
DATABASE_URL="$DATABASE_URL" WS_BACKEND_PORT=$WS_BACKEND_PORT node dist/index.js &
WS_PID=$!

sleep 2

# ── Step 5: Confirm ──────────────────────────────────────────
echo ""
echo "=================================================="
echo "✅ All whiteboard services running:"
echo "   HTTP  → http://localhost:$HTTP_BACKEND_PORT  (PID $HTTP_PID)"
echo "   WS    → ws://localhost:$WS_BACKEND_PORT      (PID $WS_PID)"
echo "   DB    → zoomwhiteboard @ localhost:5432"
echo ""
echo "Open Prisma Studio to inspect data:"
echo "   DATABASE_URL='$DATABASE_URL' npx prisma studio"
echo "   Then visit: http://localhost:5555"
echo ""
echo "Press Ctrl+C to stop both backends"
echo "=================================================="

wait
