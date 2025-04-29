// src/lib/types.ts

// Repräsentiert ein Quelldokument
export interface SourceDocument {
    id?: number;
    source: string;     // Quelle/Pfad des Dokuments
    content: string;    // Vollständiger Inhalt des Dokuments
    metadata?: Record<string, any>; // Zusätzliche Metadaten
  }
  
  // Repräsentiert einen Textchunk aus einem Quelldokument
  export interface TextChunk {
    id?: number;
    sourceId?: number;  // Referenz auf das Quelldokument
    source: string;     // Quelle/Pfad des Dokuments
    content: string;    // Inhalt des Chunks
    chunkIndex: number; // Index des Chunks im Quelldokument
    metadata?: Record<string, any>; // Zusätzliche Metadaten
  }
  
  // Repräsentiert einen kontextualisierten Chunk (nach der Verarbeitung)
  export interface ContextualizedChunk extends TextChunk {
    contextSummary: string;          // Generierte Zusammenfassung/Kontext
    contextualizedContent: string;   // Zusammengeführter Text (Kontext + Original)
    embedding?: number[];            // Gemini Vektor-Embedding
    bm25Vector?: string;             // BM25 Vektor (als String-Repräsentation)
  }
  
  // Ergebnis der Suche (für BM25 und Vektor-Suche)
  export interface ChunkSearchResult {
    id: number;
    source: string;
    content: string;
    contextSummary: string;
    contextualizedContent: string;
    score: number;  // Relevanz-Score
    metadata?: Record<string, any>;
  }
  
  // Optionen für das Chunking
  export interface ChunkingOptions {
    maxChunkSize: number;
    chunkOverlap: number;
    strategy: 'character' | 'sentence' | 'paragraph';
  }
  
  // Optionen für die Kontextualisierung
  export interface ContextualizerOptions {
    maxTokens: number;
    temperature: number;
  }