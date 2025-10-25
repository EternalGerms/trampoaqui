# Multi-stage build para otimização
# Stage 1: Build dependencies and application
FROM node:25.0.0-alpine3.21 AS builder

WORKDIR /app

# Copy only package files first to leverage Docker cache
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy configuration files
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./
COPY drizzle.config.ts ./

# Copy source code
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/

# Build frontend
RUN npm run build

# Stage 2: Production image
FROM node:25.0.0-alpine3.21 AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Create non-root user using Debian-compatible commands
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs --no-create-home --shell /bin/false nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./

# Copy server files for production
COPY --chown=nextjs:nodejs server/ ./server/
COPY --chown=nextjs:nodejs shared/ ./shared/

USER nextjs

EXPOSE 5000

ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]