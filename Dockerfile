# ── Build stage ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install root deps
COPY package.json ./
RUN npm install

# Build server
COPY server/package.json server/
RUN cd server && npm install --legacy-peer-deps
COPY server/ server/
RUN cd server && npm run build

# Build client
COPY client/package.json client/
RUN cd client && npm install
COPY client/ client/
RUN cd client && npm run build

# ── Production stage ─────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy server
COPY --from=builder /app/server/package.json server/
RUN cd server && npm install --omit=dev --legacy-peer-deps
COPY --from=builder /app/server/dist server/dist/

# Copy client build
COPY --from=builder /app/client/dist server/public/

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
