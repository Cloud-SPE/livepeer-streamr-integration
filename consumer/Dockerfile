# Install dependencies for all workspaces (root + shared + consumer)
FROM node:20-alpine AS deps
WORKDIR /app

# Root workspace manifests
COPY package.json package-lock.json ./

# Workspace manifests needed for dependency resolution
COPY packages/shared/package.json ./packages/shared/package.json
COPY consumer/package.json ./consumer/package.json

RUN npm ci --omit=dev

# --- Runtime image ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules

# Copy source for shared + consumer
COPY packages/shared ./packages/shared
COPY consumer ./consumer

WORKDIR /app/consumer

CMD ["node", "index.js"]
