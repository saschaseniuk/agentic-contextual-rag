// src/rag/tokenizer.config.ts
import { DbClient } from '../db/client';

/**
 * Tokenisiert einen Text für die BM25-Indizierung
 * Verwendet die pg_tokenizer.rs-Erweiterung in PostgreSQL
 */
export async function tokenizeForBM25(text: string): Promise<string> {
  try {
    const result = await DbClient.query<{ bm25vector: string }>(
      `SELECT to_bm25vector($1) as bm25vector`,
      [text]
    );

    return result.rows[0]?.bm25vector || '';
  } catch (error) {
    console.error('Fehler bei der BM25-Tokenisierung:', error);
    throw error;
  }
}

/**
 * Prüft, ob die BM25-Funktionalität in der Datenbank verfügbar ist
 */
export async function testBM25Functionality(): Promise<boolean> {
  try {
    await DbClient.query('SELECT to_bm25vector(\'test\') as test');
    return true;
  } catch (error) {
    console.warn('BM25-Funktionalität nicht verfügbar:', error);
    return false;
  }
}

/**
 * Konfiguriert den BM25-Tokenizer in der Datenbank
 * (Falls die Datenbank eine Konfigurationsmöglichkeit bietet)
 */
export async function configureBM25Tokenizer(
  options: {
    stopWords?: string[];
    language?: string;
  } = {}
): Promise<void> {
  const { stopWords = [], language = 'german' } = options;

  try {
    // Diese Funktion ist hypothetisch und hängt von der tatsächlichen 
    // Implementierung der pg_tokenizer.rs-Erweiterung ab
    if (stopWords.length > 0) {
      await DbClient.query(
        `SELECT bm25_set_stopwords($1, $2)`,
        [language, stopWords]
      );
    }

    console.log(`BM25-Tokenizer konfiguriert für Sprache: ${language}`);
  } catch (error) {
    console.warn('Fehler bei der BM25-Tokenizer-Konfiguration:', error);
    // Wir werfen den Fehler nicht, da dies möglicherweise nicht unterstützt wird
  }
}