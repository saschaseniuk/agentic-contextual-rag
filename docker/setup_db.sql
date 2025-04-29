-- setup_db.sql (Vereinfachte Version für PGVector)

-- Aktiviere nur die für Vektorspeicherung benötigte Erweiterung
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabelle für Dokumenten-Chunks erstellen (vereinfacht)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    source TEXT,
    content TEXT NOT NULL,
    context_summary TEXT,
    -- WICHTIG: Setze die Dimension entsprechend dem Gemini Embedding Modell (z.B. 768)
    embedding VECTOR(768),
    metadata JSONB,
    -- Referenz auf den Elasticsearch-Index
    elasticsearch_id TEXT
);

-- Index für Vektorsuche (pgvector - HNSW Index für Kosinus-Ähnlichkeit)
CREATE INDEX documents_embedding_vector_hnsw ON documents USING hnsw (embedding vector_cosine_ops);

-- Bestätigungsnachricht
\echo 'Datenbank-Setup abgeschlossen: PGVector aktiviert und Tabelle "documents" mit Indizes erstellt.'