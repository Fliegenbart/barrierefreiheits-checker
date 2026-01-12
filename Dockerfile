# Dockerfile für die Barrierefreiheit-Plattform (Next.js)
# Multi-Stage Build für optimale Produktions-Images
# Mit FFmpeg-Unterstützung für serverseitige Video-Verarbeitung

# ===== Stage 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

# Package files kopieren
COPY package.json package-lock.json* ./

# Dependencies installieren
RUN npm ci --only=production

# ===== Stage 2: Builder =====
FROM node:20-alpine AS builder
WORKDIR /app

# Dependencies von vorherigem Stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment Variablen für Build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Next.js Build
RUN npm run build

# ===== Stage 3: Runner =====
FROM node:20-alpine AS runner
WORKDIR /app

# FFmpeg installieren für serverseitige Video-Verarbeitung
RUN apk add --no-cache ffmpeg

# Environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user für Sicherheit
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Nur benötigte Dateien kopieren
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Temporäre Verzeichnisse für Datei-Verarbeitung
RUN mkdir -p tmp/uploads tmp/output public/downloads public/reports
RUN chown -R nextjs:nodejs tmp public/downloads public/reports

# User wechseln
USER nextjs

# Port freigeben
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Server starten
CMD ["node", "server.js"]
