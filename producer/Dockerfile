# Install dependencies for all workspaces (root + shared + producer)
FROM node:20-alpine AS deps
WORKDIR /app

# Root workspace manifests
COPY package.json package-lock.json ./

# Workspace manifests needed for dependency resolution
COPY packages/shared/package.json ./packages/shared/package.json
COPY producer/package.json ./producer/package.json

# Install all workspaces; shared and producer will be installed
RUN npm ci --omit=dev

# --- Runtime image ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy node_modules (includes workspace deps, including @livepeer-streamr/shared)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code for shared and producer
COPY packages/shared ./packages/shared
COPY producer ./producer

WORKDIR /app/producer

# Producer exposes a WebSocket server (default port from env)
EXPOSE 8080

CMD ["node", "index.js"]
