# Base image Node.js 24 LTS
FROM node:24-alpine

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build Vite frontend assets and bundle server.ts
RUN npm run build

# Expose server port 3000
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Command to launch fullstack server
CMD ["node", "dist/server.cjs"]
