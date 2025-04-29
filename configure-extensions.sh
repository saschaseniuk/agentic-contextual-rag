#!/bin/bash
# simple-bm25-setup.sh - Einfaches Setup für BM25 in PostgreSQL

echo "=== Einfaches BM25-Setup für PostgreSQL ==="

# Container-Name
CONTAINER_NAME="docker-postgres-1"

# Prüfe, ob der Container läuft
if ! docker ps | grep -q $CONTAINER_NAME; then
  echo "❌ Der Container '$CONTAINER_NAME' scheint nicht zu laufen."
  echo "Bitte starte den Container zuerst mit: docker start $CONTAINER_NAME"
  exit 1
fi

echo "✅ Container '$CONTAINER_NAME' läuft."

# Führe grundlegende SQL-Befehle aus
echo "Konfiguriere grundlegende Einstellungen..."

docker exec -i $CONTAINER_NAME psql -U postgres -d rag_db << EOF
-- Erstelle die Erweiterungen, falls sie noch nicht existieren
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_tokenizer CASCADE;
CREATE EXTENSION IF NOT EXISTS vchord_bm25 CASCADE;

-- Setze den Suchpfad korrekt
ALTER SYSTEM SET search_path TO "\$user", public, tokenizer_catalog, bm25_catalog;
SELECT pg_reload_conf();

-- Einfacher Test, ob die Erweiterungen funktionieren
SELECT 'BM25-Erweiterungen wurden aktiviert.' AS info;
EOF

# Erstelle einen einfachen Text-Analyzer und Tokenizer
echo "Erstelle einen einfachen Text-Analyzer und Tokenizer..."

docker exec -i $CONTAINER_NAME psql -U postgres -d rag_db << EOF
-- Erstelle einen einfachen Text-Analyzer mit unicode_segmentation
SELECT create_text_analyzer('simple_analyzer', \$\$
pre_tokenizer = "unicode_segmentation"  -- Teilt den Text basierend auf Unicode-Regeln
[[character_filters]]
to_lowercase = {}                       -- Konvertiert alles zu Kleinbuchstaben
\$\$);

-- Erstelle einen Tokenizer basierend auf dem Text-Analyzer
SELECT create_tokenizer('simple_tokenizer', \$\$
text_analyzer = "simple_analyzer"       -- Verwendet den erstellten Text-Analyzer
\$\$);

-- Teste den Tokenizer
SELECT tokenize('Dies ist ein Test für BM25-Funktionalität', 'simple_tokenizer') AS tokens;
EOF

# Erstelle eine Beispieltabelle mit BM25-Vektor
echo "Erstelle eine Beispieltabelle mit BM25-Vektor..."

docker exec -i $CONTAINER_NAME psql -U postgres -d rag_db << EOF
-- Lösche die Tabelle, falls sie bereits existiert
DROP TABLE IF EXISTS test_documents;

-- Erstelle eine Tabelle für Dokumente mit BM25-Vektor
CREATE TABLE test_documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding BM25VECTOR
);

-- Füge einige Beispieldokumente hinzu
INSERT INTO test_documents (content) VALUES
  ('PostgreSQL ist ein leistungsstarkes Open-Source-Datenbanksystem.'),
  ('BM25 ist ein Ranking-Algorithmus für Textsuchmaschinen.'),
  ('VectorChord BM25 ist eine Erweiterung für PostgreSQL, die BM25-Ranking implementiert.'),
  ('TypeScript ist eine typisierte Programmiersprache, die auf JavaScript aufbaut.'),
  ('RAG steht für Retrieval-Augmented Generation und kombiniert Retrieval mit generativen Modellen.');

-- Tokenisiere die Dokumente und erstelle BM25-Vektoren
UPDATE test_documents 
SET embedding = tokenize(content, 'simple_tokenizer')::bm25vector;

-- Erstelle einen BM25-Index
CREATE INDEX test_documents_bm25_idx ON test_documents USING bm25 (embedding bm25_ops);

-- Teste eine einfache BM25-Suche
SELECT id, content, 
       embedding <&> to_bm25query('test_documents_bm25_idx', tokenize('PostgreSQL Datenbank', 'simple_tokenizer')) AS score
FROM test_documents
ORDER BY score
LIMIT 3;
EOF

# Gib Anweisungen für die weitere Nutzung
echo ""
echo "✅ BM25-Setup abgeschlossen!"
echo ""
echo "Einfache BM25-Abfragen können so ausgeführt werden:"
echo ""
echo "SELECT id, content,"
echo "       embedding <&> to_bm25query('test_documents_bm25_idx', tokenize('DEINE SUCHANFRAGE', 'simple_tokenizer')) AS score"
echo "FROM test_documents"
echo "ORDER BY score"
echo "LIMIT 10;"
echo ""
echo "In TypeScript kannst du die Abfrage so ausführen:"
echo ""
echo "const result = await client.query(\`"
echo "  SELECT id, content, embedding <&> to_bm25query('test_documents_bm25_idx', tokenize(\$1, 'simple_tokenizer')) AS score"
echo "  FROM test_documents"
echo "  ORDER BY score"
echo "  LIMIT 10"
echo "\`, ['DEINE SUCHANFRAGE']);"