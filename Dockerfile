FROM node:22.17.0-alpine AS base

# Kích hoạt pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package.json, pnpm-lock.yaml và .npmrc (nếu có)
COPY package.json pnpm-lock.yaml .npmrc* ./

# Cho phép thực thi build scripts của các thư viện native như sharp, esbuild
RUN pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 20000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm config set fetch-timeout 1200000 && \
    pnpm install --frozen-lockfile --dangerously-allow-all-builds

# Stage 2: Build source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Stage 3: Runner chạy production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]