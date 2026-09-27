# ==============================================================================
# PIXEL (ODVPA): On-Device Visual Perception Runtime Dockerfile
# Smart India Hackathon 2026 - Problem Statement 26171 (ISRO / Dept of Space)
# ==============================================================================

FROM node:20-bullseye-slim AS base

# Install system utilities needed for native graphics and sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install package dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose PIXEL Studio & API port
EXPOSE 3000

# Environment defaults
ENV PORT=3000
ENV NODE_ENV=production

# Healthcheck to verify perception studio uptime
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/benchmark || exit 1

# Default command: start PIXEL Visual Studio Dashboard & API Bridge
CMD ["node", "studio.js"]
