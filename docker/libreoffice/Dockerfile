# LibreOffice Konvertierungs-Worker
# Basiert auf Alpine Linux für minimale Größe

FROM alpine:3.19

# LibreOffice und Abhängigkeiten installieren
RUN apk add --no-cache \
    libreoffice \
    libreoffice-writer \
    libreoffice-impress \
    font-noto \
    font-noto-cjk \
    font-noto-emoji \
    ttf-dejavu \
    ttf-liberation \
    nodejs \
    npm \
    && rm -rf /var/cache/apk/*

# Arbeitsverzeichnis
WORKDIR /app

# Node.js Worker-Abhängigkeiten
COPY package*.json ./
RUN npm ci --only=production

# Worker-Code kopieren
COPY . .

# Temporäre Verzeichnisse
RUN mkdir -p /tmp/uploads /tmp/output

# Non-root User für Sicherheit
RUN adduser -D -u 1000 worker
RUN chown -R worker:worker /app /tmp/uploads /tmp/output
USER worker

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Worker starten
CMD ["node", "worker.js"]
