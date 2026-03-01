# ── Stage 1: Builder ──────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/

RUN npm install --legacy-peer-deps

RUN ./node_modules/.bin/prisma generate

COPY . .
RUN ./node_modules/.bin/nest build

# ── Stage 2: Production ───────────────────────────────
FROM node:20-alpine AS production

RUN addgroup -g 1001 nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

USER nestjs

EXPOSE 8008

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8008/recours-service/v1/health/live || exit 1

CMD ["node", "dist/src/main"]