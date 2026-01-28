#!/bin/sh
set -e

echo "🚀 Starting Tumulte Backend..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until curl -f http://${DB_HOST}:${DB_PORT} 2>&1 | grep -q "52"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is up"

# Wait for Redis to be ready (optional, if using Redis)
if [ -n "$REDIS_HOST" ]; then
  echo "⏳ Waiting for Redis..."
  until nc -z ${REDIS_HOST} ${REDIS_PORT}; do
    echo "Redis is unavailable - sleeping"
    sleep 2
  done
  echo "✅ Redis is up"
fi

# Run database migrations
# Uses pre-compiled JavaScript if available, otherwise falls back to ts-node
echo "🔄 Running database migrations..."
if [ -f "bin/console.js" ]; then
  node bin/console.js migration:run --force
else
  node --loader ts-node-maintained/esm bin/console.ts migration:run --force
fi

# Check if migrations succeeded
if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migrations failed"
  exit 1
fi

# Start the application
echo "🎯 Starting application..."
exec "$@"
