# syntax=docker/dockerfile:1

# ===========================================
# Stage 1: Dependencies installation
# ===========================================
FROM node:22-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (production + dev for build)
RUN npm ci && npm cache clean --force

# ===========================================
# Stage 2: Build TypeScript to JavaScript
# ===========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build TypeScript to JavaScript
# This compiles all TS files to JS in the /build directory
RUN npm run build:docker

# ===========================================
# Stage 3: Production dependencies only
# ===========================================
FROM node:22-alpine AS prod-deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (no devDependencies)
RUN npm ci --omit=dev && npm cache clean --force

# ===========================================
# Stage 4: Production runtime
# ===========================================
FROM node:22-alpine AS production

# Install runtime dependencies:
# - dumb-init: proper signal handling for Node.js
# - curl: health checks
# - postgresql-client: wait for database
# - netcat-openbsd: check Redis connectivity
RUN apk add --no-cache dumb-init curl postgresql-client netcat-openbsd

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies from prod-deps stage
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built JavaScript from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/build ./

# Copy entrypoint script
COPY --chown=nodejs:nodejs docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production \
    PORT=3333 \
    HOST=0.0.0.0 \
    # Optimize Node.js for production
    NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps"

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3333

# Health check endpoint
# Uses /health/ready for readiness (checks DB + Redis)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3333/health/ready || exit 1

# Use custom entrypoint that runs migrations
ENTRYPOINT ["dumb-init", "--", "docker-entrypoint.sh"]

# Start the application with pre-compiled JavaScript (faster startup)
CMD ["node", "bin/server.js"]
