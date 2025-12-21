#!/bin/bash

# ========================================
# Tumulte - Quick Start Script
# ========================================

set -e

echo "🎲 Starting Tumulte Development Environment..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please edit it with your configuration."
    echo ""
fi

# Start PostgreSQL
echo "🐘 Starting PostgreSQL..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
done
echo "✅ PostgreSQL is ready!"
echo ""

# Backend setup
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

# Check if APP_KEY is generated
if grep -q "generate_with_node_ace_generate_key" backend/.env 2>/dev/null; then
    echo "🔑 Generating APP_KEY..."
    cd backend
    node ace generate:key
    cd ..
fi

# Run migrations
echo "🗄️  Running database migrations..."
cd backend
node ace migration run
cd ..
echo "✅ Migrations completed!"
echo ""

# Frontend setup
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env with your Twitch OAuth credentials"
echo "   2. Start the backend:  cd backend && npm run dev"
echo "   3. Start the frontend: cd frontend && npm run dev"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3333"
echo ""
echo "📚 Documentation:"
echo "   README.md - General documentation"
echo "   DOKPLOY_DEPLOYMENT.md - Deployment guide for Dokploy"
echo ""
