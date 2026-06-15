FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/
RUN npm install --legacy-peer-deps
RUN ./node_modules/.bin/prisma generate
COPY . .
RUN ./node_modules/.bin/nest build

FROM node:20-alpine AS production
# hadolint ignore=DL3018
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm install effect
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY prisma.config.ts ./
EXPOSE 8009
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
