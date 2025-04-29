#!/bin/bash
# init-db.sh - Initialisierungsskript für die Datenbank

# Funktion zum Beenden mit Fehlermeldung
error_exit() {
  echo "❌ ERROR: $1"
  exit 1
}

# Verzeichnisstruktur anlegen
echo "📁 Erstelle Verzeichnisstruktur..."
mkdir -p docker
mkdir -p data

# Prüfen, ob setup_db.sql existiert
if [ ! -f "./docker/setup_db.sql" ]; then
  echo "📄 Erstelle setup_db.sql..."
  cat > ./docker/setup_db.sql << 'EOL'
-- setup_db.sql

-- Erforderliche Erweiterungen aktivieren
CREATE EXTENSION IF NOT EXISTS vector;             -- Für Vektortypen und -suche (pgvector)
CREATE EXTENSION IF NOT EXISTS pg_tokenizer CASCADE; -- Tokenizer für VectorChord
CREATE EXTENSION IF NOT EXISTS vchord_bm25 CASCADE; -- Für BM25-Suche (VectorChord)

-- WICHTIG: Passe den search_path an, damit Postgres die Funktionen der Extensions findet
-- Fügt die Schemas der Tokenizer- und BM25-Extensions zum Suchpfad hinzu
ALTER SYSTEM SET search_path TO "$user", public, tokenizer_catalog, bm25_catalog;
-- Lade die Konfiguration neu, damit die Änderung wirksam wird
SELECT pg_reload_conf();

-- Tabelle für Dokumenten-Chunks erstellen
DROP TABLE IF EXISTS documents;
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    source TEXT,
    content TEXT NOT NULL,
    context_summary TEXT,
    -- WICHTIG: Setze die Dimension entsprechend dem Gemini Embedding Modell (z.B. 768)
    embedding VECTOR(768),                     -- Vektor-Embedding (Dimension anpassen!)
    bm25vector BM25VECTOR,                   -- BM25 Vektor
    metadata JSONB
);

-- Indizes erstellen

-- Index für BM25 Suche (VectorChord)
-- Dieser Index wird benötigt, damit die Extension die globale Dokumentfrequenz sammeln kann
-- und der <&> Operator effizient funktioniert.
CREATE INDEX documents_embedding_bm25 ON documents USING bm25 (embedding bm25_ops);

-- Index für Vektorsuche (pgvector - Beispiel HNSW)
CREATE INDEX documents_embedding_vector_hnsw ON documents USING hnsw (embedding vector_cosine_ops);
-- Alternativ IVFFlat:
-- CREATE INDEX documents_embedding_vector_ivfflat ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Teste, ob die Tabelle korrekt erstellt wurde
INSERT INTO documents (source, content, context_summary, metadata)
VALUES ('test', 'Test content', 'Test summary', '{"test": true}');

-- Lösche den Testeintrag wieder
DELETE FROM documents WHERE source = 'test';

-- Bestätigungsnachricht
SELECT 'Datenbank-Setup abgeschlossen: Erweiterungen aktiviert, search_path gesetzt und Tabelle "documents" mit Indizes erstellt.' as message;
EOL
fi

# Prüfen, ob docker-compose.yml existiert
if [ ! -f "./docker/docker-compose.yml" ]; then
  echo "📄 Erstelle docker-compose.yml..."
  cat > ./docker/docker-compose.yml << 'EOL'
# docker/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: ghcr.io/tensorchord/vchord_bm25-postgres:pg17-v0.2.0
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=rag_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./setup_db.sql:/docker-entrypoint-initdb.d/setup_db.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
EOL
fi

# Prüfen, ob Docker installiert ist
if ! command -v docker &> /dev/null; then
  error_exit "Docker ist nicht installiert. Bitte installiere Docker und docker-compose"
fi

# Prüfen, ob docker-compose installiert ist
if ! command -v docker-compose &> /dev/null; then
  error_exit "Docker Compose ist nicht installiert. Bitte installiere docker-compose"
fi

# Prüfen, ob der PostgreSQL-Container bereits läuft
echo "🔍 Prüfe, ob PostgreSQL-Container bereits läuft..."
if docker ps | grep -q vchord_bm25-postgres; then
  echo "✅ PostgreSQL-Container läuft bereits."
else
  # Docker-Container starten
  echo "🚀 Starte PostgreSQL-Container..."
  cd docker && docker-compose up -d || error_exit "Konnte Docker-Container nicht starten"
  
  # Warten, bis der Container läuft und bereit ist
  echo "⏳ Warte auf PostgreSQL (10 Sekunden)..."
  sleep 10
fi

# Container-Status anzeigen
docker ps | grep postgres

# Prüfen, ob die Datenbank erreichbar ist
echo "🔍 Prüfe, ob PostgreSQL erreichbar ist..."
if ! docker exec $(docker ps -q --filter name=postgres) pg_isready -U postgres; then
  error_exit "PostgreSQL ist nicht erreichbar. Bitte prüfe die Docker-Logs"
fi

echo "✅ PostgreSQL ist bereit und erreichbar."

# Prüfen, ob die Tabelle documents existiert
echo "🔍 Prüfe, ob die Tabelle 'documents' existiert..."
TABLE_EXISTS=$(docker exec $(docker ps -q --filter name=postgres) psql -U postgres -d rag_db -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents')")

if [[ $TABLE_EXISTS == *"t"* ]]; then
  echo "✅ Tabelle 'documents' existiert."
else
  echo "❌ Tabelle 'documents' existiert nicht. Führe setup_db.sql aus..."
  docker exec $(docker ps -q --filter name=postgres) psql -U postgres -d rag_db -f /docker-entrypoint-initdb.d/setup_db.sql || error_exit "Konnte setup_db.sql nicht ausführen"
fi

# Führe abschließenden Check durch
echo "🔍 Führe abschließenden Datenbankcheck durch..."
if command -v npm &> /dev/null; then
  npm run check:db
else
  echo "⚠️ npm nicht gefunden, überspringe Datenbankcheck"
  echo "Führe stattdessen manuell 'npm run check:db' aus, nachdem du npm installiert hast"
fi

echo "✅ Datenbankinitialisierung abgeschlossen."
echo "📋 Du kannst jetzt mit 'npm run ingest' fortfahren."