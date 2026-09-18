# Base image Node.js 24 LTS
FROM node:24-alpine

WORKDIR /app

# Install curl for Docker healthcheck
RUN apk add --no-cache curl

# Copy dependency configs
COPY package*.json ./

# Install all dependencies (including devDependencies needed for vite & esbuild)
RUN npm ci

# Copy source code
COPY . .

# Build Vite frontend assets and bundle server.ts
RUN npm run build

# Prune devDependencies to keep image lean
RUN npm prune --production

# Expose server port 3000
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Command to launch fullstack server
CMD ["node", "dist/server.cjs"]
