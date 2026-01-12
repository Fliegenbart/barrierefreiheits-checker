# Deployment-Anleitung: Barrierefreiheit-Plattform

Diese Anleitung beschreibt das Deployment der Barrierefreiheit-Plattform auf einem deutschen Server.

## Voraussetzungen

### Server-Anforderungen
- **Betriebssystem:** Linux (Ubuntu 22.04 LTS empfohlen)
- **RAM:** Mindestens 2 GB (4 GB empfohlen für Video-Verarbeitung)
- **Speicher:** Mindestens 20 GB SSD
- **CPU:** 2 Cores (4 Cores empfohlen)

### Software
- Docker 24.0+ und Docker Compose v2
- Git

### API-Schlüssel
- **OpenAI API Key** (erforderlich für KI-Funktionen)
  - Alt-Text-Generator
  - Leichte Sprache Konverter
  - Video-Transkription (Whisper)

---

## Schnellstart (5 Minuten)

```bash
# 1. Repository klonen
git clone https://github.com/IHRE-ORG/barrierefreiheit-plattform.git
cd barrierefreiheit-plattform

# 2. Umgebungsvariablen konfigurieren
cp .env.example .env
nano .env  # OPENAI_API_KEY eintragen

# 3. Container bauen und starten
docker compose -f docker-compose.prod.yml up -d --build

# 4. Logs prüfen
docker compose -f docker-compose.prod.yml logs -f
```

Die Anwendung ist nun unter `http://SERVER-IP:3000` erreichbar.

---

## Deployment mit HTTPS (empfohlen)

Für Produktionsumgebungen sollte HTTPS mit Let's Encrypt verwendet werden.

### 1. Domain konfigurieren

Erstellen Sie einen DNS A-Record:
```
barrierefreiheit.ihre-domain.de → SERVER-IP
```

### 2. Umgebungsvariablen anpassen

```bash
# .env bearbeiten
DOMAIN=barrierefreiheit.ihre-domain.de
ACME_EMAIL=admin@ihre-domain.de
OPENAI_API_KEY=sk-...
```

### 3. Mit Traefik starten

```bash
docker compose -f docker-compose.prod.yml --profile traefik up -d --build
```

Die Anwendung ist nun unter `https://barrierefreiheit.ihre-domain.de` erreichbar.

---

## Konfiguration

### Umgebungsvariablen

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `OPENAI_API_KEY` | Ja | OpenAI API-Schlüssel für KI-Funktionen |
| `DOMAIN` | Für HTTPS | Ihre Domain |
| `ACME_EMAIL` | Für HTTPS | E-Mail für Let's Encrypt |
| `ANTHROPIC_API_KEY` | Nein | Alternative KI mit Claude |

### Ports

| Port | Dienst |
|------|--------|
| 3000 | Next.js Anwendung |
| 80 | HTTP (Traefik) |
| 443 | HTTPS (Traefik) |

---

## Wartung

### Logs anzeigen

```bash
# Alle Logs
docker compose -f docker-compose.prod.yml logs -f

# Nur App-Logs
docker compose -f docker-compose.prod.yml logs -f app
```

### Neustart

```bash
docker compose -f docker-compose.prod.yml restart
```

### Update

```bash
# Neuen Code holen
git pull

# Container neu bauen und starten
docker compose -f docker-compose.prod.yml up -d --build
```

### Automatische Updates (optional)

Aktivieren Sie Watchtower für automatische Container-Updates:

```bash
docker compose -f docker-compose.prod.yml --profile autoupdate up -d
```

---

## Backup

### Wichtige Verzeichnisse

Die Anwendung ist weitgehend zustandslos. Temporäre Dateien werden automatisch gelöscht.

Falls Sie generierte Dateien sichern möchten:

```bash
# Volumes sichern
docker run --rm -v barrierefreiheit-plattform_app-downloads:/data -v $(pwd):/backup alpine tar czf /backup/downloads-backup.tar.gz -C /data .
```

---

## Fehlerbehebung

### Container startet nicht

```bash
# Status prüfen
docker compose -f docker-compose.prod.yml ps

# Detaillierte Logs
docker compose -f docker-compose.prod.yml logs app
```

### FFmpeg-Fehler bei Video-Verarbeitung

FFmpeg ist im Container vorinstalliert. Prüfen Sie:

```bash
docker compose -f docker-compose.prod.yml exec app ffmpeg -version
```

### OpenAI API-Fehler

1. Prüfen Sie den API-Key in `.env`
2. Prüfen Sie Ihr OpenAI-Guthaben
3. Logs: `docker compose -f docker-compose.prod.yml logs app | grep -i openai`

### HTTPS-Zertifikat-Fehler

```bash
# Zertifikat-Status prüfen
docker compose -f docker-compose.prod.yml exec traefik cat /letsencrypt/acme.json

# Traefik-Logs
docker compose -f docker-compose.prod.yml logs traefik
```

---

## Sicherheit

### Empfohlene Maßnahmen

1. **Firewall konfigurieren** (nur Ports 80, 443 öffnen)
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

2. **Regelmäßige Updates**
   ```bash
   apt update && apt upgrade -y
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

3. **SSH-Zugang absichern** (Key-basierte Authentifizierung)

### Datenschutz (DSGVO)

- Keine Benutzerdaten werden dauerhaft gespeichert
- Hochgeladene Dateien werden nur temporär verarbeitet
- KI-Anfragen werden an OpenAI gesendet (siehe OpenAI Datenschutzrichtlinie)
- Server-Standort: Deutschland (wenn auf deutschem Server gehostet)

---

## Deutsche Hosting-Anbieter (Empfehlungen)

| Anbieter | Produkt | Preis (ca.) |
|----------|---------|-------------|
| Hetzner | CX21 | 5€/Monat |
| Netcup | VPS 1000 G10 | 8€/Monat |
| IONOS | VPS M | 6€/Monat |
| OVH | VPS Starter | 4€/Monat |

Alle genannten Anbieter haben Rechenzentren in Deutschland.

---

## Support

Bei Fragen oder Problemen:
- GitHub Issues: [Repository-URL]/issues
- E-Mail: [Ihre Support-E-Mail]
