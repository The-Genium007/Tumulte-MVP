# syntax=docker/dockerfile:1

# Stage 1: Builder - Install dependencies and build Nuxt application
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ && \
    npm install -g npm@11

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build arguments for runtime URLs (no default, must be provided via .env or build args)
ARG NUXT_PUBLIC_API_BASE
ARG NUXT_PUBLIC_SENTRY_DSN
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE}
ENV NUXT_PUBLIC_SENTRY_DSN=${NUXT_PUBLIC_SENTRY_DSN}
ENV NODE_ENV=production

# Build Nuxt application
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling and curl for health checks
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built Nuxt output from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/.output ./.output
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    NODE_OPTIONS="--max-old-space-size=256"

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start Nuxt application
CMD ["node", ".output/server/index.mjs"]
