// src/db/schema.ts
import { DbClient } from './client';
import { config } from '../lib/config';
import { ContextualizedChunk, SourceDocument } from '../lib/types';

/**
 * Enthält Funktionen für die Interaktion mit der Datenbank-Tabelle für Dokumente und Chunks
 */
export class DocumentsStore {
  /**
   * Speichert ein Quelldokument in der Datenbank
   */
  static async saveDocument(document: SourceDocument): Promise<number> {
    const { source, content, metadata } = document;
    
    const result = await DbClient.query<{ id: number }>(
      `INSERT INTO documents (source, content, metadata)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [source, content, metadata ? JSON.stringify(metadata) : null]
    );
    
    return result.rows[0].id;
  }

  /**
   * Speichert einen kontextualisierten Chunk in der Datenbank
   */
  static async saveContextualizedChunk(chunk: ContextualizedChunk): Promise<number> {
    const {
      source,
      content,
      contextSummary,
      contextualizedContent,
      embedding,
      metadata
    } = chunk;

    // Wenn kein Embedding vorhanden ist, werfen wir einen Fehler
    if (!embedding) {
      throw new Error('Embedding fehlt beim kontextualisierten Chunk');
    }

    const result = await DbClient.query<{ id: number }>(
      `INSERT INTO documents 
         (source, content, context_summary, embedding, metadata) 
       VALUES 
         ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [
        source,
        content,
        contextSummary,
        `[${embedding.join(',')}]`, // Array als String
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Speichert einen kontextualisierten Chunk mit Referenz auf die Elasticsearch-ID
   */
  static async saveContextualizedChunkWithESRef(
    chunk: ContextualizedChunk, 
    elasticsearchId: string
  ): Promise<number> {
    const {
      source,
      content,
      contextSummary,
      contextualizedContent,
      embedding,
      metadata
    } = chunk;

    // Wenn kein Embedding vorhanden ist, werfen wir einen Fehler
    if (!embedding) {
      throw new Error('Embedding fehlt beim kontextualisierten Chunk');
    }

    const result = await DbClient.query<{ id: number }>(
      `INSERT INTO documents 
         (source, content, context_summary, embedding, metadata, elasticsearch_id) 
       VALUES 
         ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [
        source,
        content,
        contextSummary,
        `[${embedding.join(',')}]`, // Array als String
        metadata ? JSON.stringify(metadata) : null,
        elasticsearchId
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Prüft, ob die Dokumente-Tabelle die erwartete Struktur hat
   */
  static async verifySchema(): Promise<boolean> {
    try {
      const result = await DbClient.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'documents'
      `);
      
      // Prüfe, ob die erwarteten Spalten vorhanden sind, die im aktualisierten setup_db.sql definiert sind
      const expectedColumns = [
        'id', 'source', 'content', 'context_summary', 
        'embedding', 'metadata', 'elasticsearch_id'
      ];
      
      const foundColumns = result.rows.map(row => row.column_name);
      const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.warn(`Schema-Validierung: Fehlende Spalten: ${missingColumns.join(', ')}`);
        return false;
      }
      
      // Prüfe den Embedding-Vektor auf die richtige Dimension
      const embeddingCol = result.rows.find(row => row.column_name === 'embedding');
      if (embeddingCol && embeddingCol.data_type === 'USER-DEFINED') {
        // Hier könnte man noch die Dimension prüfen, was aber komplexer ist
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Fehler bei der Schema-Validierung:', error);
      return false;
    }
  }

  /**
   * Löscht alle Dokumente und Chunks aus der Datenbank
   */
  static async clearAll(): Promise<void> {
    await DbClient.query('DELETE FROM documents');
  }

  /**
   * Findet einen PostgreSQL-Datensatz anhand der Elasticsearch-ID
   */
  static async findByElasticsearchId(elasticsearchId: string): Promise<any | null> {
    const result = await DbClient.query(
      `SELECT * FROM documents WHERE elasticsearch_id = $1`,
      [elasticsearchId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }
}