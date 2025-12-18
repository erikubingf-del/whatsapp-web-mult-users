# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client
RUN npx prisma generate
# Build Next.js
RUN npm run build

# Stage 3: Production Runner
FROM mcr.microsoft.com/playwright:v1.49.1-jammy AS runner
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
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Regenerate Prisma Client for Debian
RUN npx prisma generate

# Install Playwright browsers matching the library version
RUN npx playwright install chromium --with-deps

# Create directories for persistent data
RUN mkdir -p .sessions public/uploads logs data sessions

# Expose port
EXPOSE 3000

# Start the custom server with transpile-only (skips type checking for faster startup)
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx ts-node --transpile-only server.ts"]
