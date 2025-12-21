# syntax=docker/dockerfile:1

# Stage 1: Builder - Compile TypeScript and install all dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build AdonisJS application (compile TypeScript)
RUN npm run build

# Stage 2: Production dependencies only
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Production runtime
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling and curl for health checks
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/build ./build

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy necessary runtime files
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs adonisrc.js ./

# Set environment variables
ENV NODE_ENV=production \
    PORT=3333 \
    HOST=0.0.0.0 \
    TS_NODE_TRANSPILE_ONLY=1 \
    NODE_OPTIONS="--max-old-space-size=512"

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3333

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3333/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application using the compiled build
CMD ["node", "--loader", "ts-node-maintained/esm", "bin/server.ts"]
