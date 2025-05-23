// src/lib/config.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Lade Umgebungsvariablen aus .env
dotenv.config();

// Projektpfad-Hilfsfunktionen für ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export const config = {
  // Datenbankeinstellungen für PostgreSQL
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'rag_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  
  // Einstellungen für Elasticsearch
  elasticsearch: {
    node: process.env.ES_NODE || 'http://localhost:9200',
    // Optionale Authentifizierung
    auth: process.env.ES_USERNAME && process.env.ES_PASSWORD ? {
      username: process.env.ES_USERNAME,
      password: process.env.ES_PASSWORD
    } : undefined,
    // Index-Name
    index: process.env.ES_INDEX || 'contextual_documents',
    // Spezialisierte Sucheinstellungen
    search: {
      minScore: parseFloat(process.env.ES_MIN_SCORE || '0.1'),
      // Standardmäßig erweiterte Suche verwenden
      useAdvanced: process.env.ES_USE_ADVANCED !== 'false',
      // Standardgewichtungen für Suchfelder
      boosts: {
        contextualized_content: 2.0,
        context_summary: 1.5,
        content: 1.0
      }
    }
  },
  
  // Google API Einstellungen
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    // Gemini Modell-IDs
    models: {
      generation: process.env.GOOGLE_GENERATION_MODEL || 'gemini-1.5-pro-latest',
      embedding: process.env.GOOGLE_EMBEDDING_MODEL || 'text-embedding-004',
    }
  },
  
  // RAG-spezifische Konfigurationen
  rag: {
    // Chunking-Einstellungen
    chunking: {
      // Maximale Anzahl von Zeichen pro Chunk
      maxChunkSize: parseInt(process.env.MAX_CHUNK_SIZE || '1000', 10),
      // Überlappung zwischen Chunks in Zeichen
      chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '100', 10),
      // Chunking-Strategie ('character', 'sentence', 'paragraph')
      strategy: process.env.CHUNKING_STRATEGY || 'paragraph',
    },
    
    // Kontextualisierungs-Einstellungen
    contextualizer: {
      // Maximale Anzahl von Token für die Kontextualisierung
      maxTokens: parseInt(process.env.CONTEXT_MAX_TOKENS || '50', 10),
      // Temperatur für die Generierung der Zusammenfassung (0-1)
      temperature: parseFloat(process.env.CONTEXT_TEMPERATURE || '0.1'),
    },
    
    // Datenbank-Einstellungen für RAG
    database: {
      // Dimension der Einbettungsvektoren
      embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || '768', 10),
    },
    
    // Pfade zu Dateien und Ordnern
    paths: {
      // Pfad zum Datenverzeichnis
      dataDir: process.env.DATA_DIR || path.join(rootDir, 'data'),
    },
    
    // Retrieval-Einstellungen
    retrieval: {
      // Anzahl der Ergebnisse aus jeder Suchmodalität
      topK: parseInt(process.env.RETRIEVAL_TOP_K || '5', 10),
      // Ob Ergebnisse aus verschiedenen Quellen kombiniert werden sollen
      combineSources: process.env.COMBINE_SEARCH_RESULTS !== 'false',
      // Wenn true, wird BM25 und Vektorsuche in einem einzigen hybriden Durchgang kombiniert
      hybridSearch: process.env.HYBRID_SEARCH === 'true',
    }
  }
};