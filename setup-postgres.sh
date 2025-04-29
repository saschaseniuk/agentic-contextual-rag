#!/bin/bash
# setup-postgres.sh - Korrigiert die PostgreSQL-Installation und Konfiguration für BM25

echo "=== PostgreSQL BM25 Setup ==="
echo "Dieser Skript stellt sicher, dass die PostgreSQL-Datenbank und die erforderlichen Erweiterungen korrekt konfiguriert sind."

# 1. Überprüfe, ob Docker installiert ist
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ist nicht installiert. Bitte installiere Docker und versuche es erneut."
    exit 1
fi

# 2. Stoppe vorhandene Container (falls vorhanden)
echo "Stoppe vorhandene Container..."
docker stop vectorchord-postgres 2>/dev/null || true
docker rm vectorchord-postgres 2>/dev/null || true

# 3. Starte einen neuen PostgreSQL-Container mit VectorChord BM25
echo "Starte neuen PostgreSQL-Container mit VectorChord BM25..."
docker run -d \
  --name vectorchord-postgres \
  -e POSTGRES_DB=rag_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v $(pwd)/docker/setup_db.sql:/docker-entrypoint-initdb.d/setup_db.sql \
  ghcr.io/tensorchord/vchord_bm25-postgres:pg17-v0.2.0

# 4. Warte, bis PostgreSQL gestartet ist
echo "Warte, bis PostgreSQL gestartet ist..."
sleep 10
attempt=1
max_attempts=10

while ! docker exec vectorchord-postgres pg_isready -U postgres -d rag_db > /dev/null 2>&1; do
    echo "Warte auf PostgreSQL ($attempt/$max_attempts)..."
    sleep 5
    attempt=$((attempt+1))
    
    if [ $attempt -gt $max_attempts ]; then
        echo "❌ PostgreSQL konnte nicht innerhalb der Zeitbegrenzung gestartet werden."
        exit 1
    fi
done

echo "✅ PostgreSQL ist gestartet."

# 5. Stelle sicher, dass die Erweiterungen korrekt installiert sind
echo "Konfiguriere die Erweiterungen..."

docker exec -it vectorchord-postgres psql -U postgres -d rag_db -c "
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_tokenizer CASCADE;
CREATE EXTENSION IF NOT EXISTS vchord_bm25 CASCADE;

-- Setze den Suchpfad korrekt
ALTER SYSTEM SET search_path TO \"\$user\", public, tokenizer_catalog, bm25_catalog;
SELECT pg_reload_conf();

-- Bestätige die Erweiterungen
SELECT extname FROM pg_extension;
"

# 6. Überprüfe die Installation mit einem einfachen Test
echo "Teste BM25-Funktionalität..."

docker exec -it vectorchord-postgres psql -U postgres -d rag_db -c "
-- Erstelle einen Tokenizer für Tests
SELECT create_tokenizer('simple', \$\$
pre_tokenizer = \"whitespace\"
[[character_filters]]
to_lowercase = {}
\$\$);

-- Teste die BM25-Funktionalität
SELECT to_bm25vector(tokenize('Dies ist ein Testtext für BM25', 'simple'));
"

# 7. Überprüfe das Ergebnis
if [ $? -eq 0 ]; then
    echo "✅ BM25-Funktionalität ist verfügbar und funktioniert!"
    echo "✅ PostgreSQL-Setup für BM25 wurde erfolgreich abgeschlossen."
else
    echo "❌ Es gab ein Problem beim Testen der BM25-Funktionalität."
    echo "Bitte überprüfe die Docker-Logs mit: docker logs vectorchord-postgres"
fi

echo ""
echo "Um die Docker-Umgebung zu beenden, führe aus: docker stop vectorchord-postgres"
echo "Um sie später wieder zu starten: docker start vectorchord-postgres"