# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client
RUN npx prisma generate
# Build Next.js
RUN npm run build

# Stage 3: Production Runner
FROM mcr.microsoft.com/playwright:v1.40.0-jammy AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

# Install Node.js (Playwright image has Node, but let's ensure version match if needed, usually it's fine)
# The Playwright image is based on Ubuntu, so we use apt-get if we need extra stuff.
# It comes with Node.js and browsers pre-installed.

# Copy built artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma

# Create directories for persistent data
RUN mkdir -p .sessions public/uploads logs data sessions

# Expose port
EXPOSE 3000

# Start the custom server
# We use ts-node in dev, but for prod we should probably compile server.ts or use ts-node with transpileOnly
# For simplicity in this prototype, we'll use ts-node but ideally we should compile it.
# Let's use ts-node for now as it's in dependencies.
CMD ["npx", "ts-node", "server.ts"]
