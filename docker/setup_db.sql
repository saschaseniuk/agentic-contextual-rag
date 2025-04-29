-- setup_db.sql (Korrigierte Version)

-- Erforderliche Erweiterungen aktivieren
CREATE EXTENSION IF NOT EXISTS vector;             -- Für Vektortypen und -suche (pgvector)
CREATE EXTENSION IF NOT EXISTS pg_tokenizer CASCADE; -- KORREKTER NAME für Tokenizer (VectorChord)
CREATE EXTENSION IF NOT EXISTS vchord_bm25 CASCADE; -- Für BM25-Suche (VectorChord)

-- WICHTIG: Passe den search_path an, damit Postgres die Funktionen der Extensions findet
-- Fügt die Schemas der Tokenizer- und BM25-Extensions zum Suchpfad hinzu
ALTER SYSTEM SET search_path TO "$user", public, tokenizer_catalog, bm25_catalog;
-- Lade die Konfiguration neu, damit die Änderung wirksam wird
SELECT pg_reload_conf();

-- Tabelle für Dokumenten-Chunks erstellen
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

-- Bestätigungsnachricht
\echo 'Datenbank-Setup abgeschlossen: Erweiterungen aktiviert, search_path gesetzt und Tabelle "documents" mit Indizes erstellt.'