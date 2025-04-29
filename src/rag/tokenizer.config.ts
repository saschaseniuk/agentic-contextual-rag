// src/rag/tokenizer.config.ts
import { DbClient } from '../db/client';

/**
 * Erstellt einen einfachen Tokenizer für die angegebene Sprache
 * @param language Die zu verwendende Sprache ('german', 'english', etc.)
 * @param tokenizerName Der Name des zu erstellenden Tokenizers
 * @returns true, wenn der Tokenizer erfolgreich erstellt wurde, sonst false
 */
export async function createSimpleTokenizer(
  language: string = 'german',
  tokenizerName: string = 'default_tokenizer'
): Promise<boolean> {
  try {
    // Definiere die Konfiguration für den Tokenizer
    // Basierend auf der VectorChord-Dokumentation
    const tokenizerConfig = `
    pre_tokenizer = "whitespace"  # Teilt den Text an Leerzeichen
    [[character_filters]]
    to_lowercase = {}             # Konvertiert alle Zeichen zu Kleinbuchstaben
    [[character_filters]]
    unicode_normalization = "nfkd"  # Normalisiert den Text
    [[token_filters]]
    skip_non_alphanumeric = {}    # Ignoriert Tokens, die keine alphanumerischen Zeichen enthalten
    [[token_filters]]
    stopwords = "nltk_${language}"  # Entfernt Stoppwörter der angegebenen Sprache
    [[token_filters]]
    stemmer = "${language}_porter2"  # Verwendet den Porter-Stemmer für die angegebene Sprache
    `;

    // Erstellt den Tokenizer
    await DbClient.query(
      `SELECT create_tokenizer($1, $2)`,
      [tokenizerName, tokenizerConfig]
    );
    
    console.log(`Einfacher Tokenizer '${tokenizerName}' für Sprache '${language}' erfolgreich erstellt.`);
    return true;
  } catch (error) {
    console.error('Fehler beim Erstellen des Tokenizers:', error);
    return false;
  }
}

/**
 * Tokenisiert einen Text für die BM25-Indizierung
 * Verwendet die pg_tokenizer.rs-Erweiterung in PostgreSQL
 */
export async function tokenizeForBM25(
  text: string,
  tokenizerName: string = 'default_tokenizer'
): Promise<string> {
  try {
    // Erst tokenisieren
    const tokenizeResult = await DbClient.query<{ result: string }>(
      `SELECT tokenize($1, $2) as result`,
      [text, tokenizerName]
    );
    
    const tokenizedText = tokenizeResult.rows[0]?.result;
    
    if (!tokenizedText) {
      throw new Error('Tokenisierung fehlgeschlagen');
    }
    
    // Dann in einen BM25-Vektor umwandeln
    const result = await DbClient.query<{ bm25vector: string }>(
      `SELECT ${tokenizedText}::bm25vector as bm25vector`
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
    // Prüfe zuerst, ob die pg_tokenizer.rs-Erweiterung verfügbar ist
    const tokenizerResult = await DbClient.query(
      `SELECT extname FROM pg_extension WHERE extname = 'pg_tokenizer'`
    );
    
    if (tokenizerResult.rows.length === 0) {
      console.warn('Die pg_tokenizer-Erweiterung ist nicht installiert.');
      return false;
    }
    
    // Prüfe, ob die vchord_bm25-Erweiterung verfügbar ist
    const bm25Result = await DbClient.query(
      `SELECT extname FROM pg_extension WHERE extname = 'vchord_bm25'`
    );
    
    if (bm25Result.rows.length === 0) {
      console.warn('Die vchord_bm25-Erweiterung ist nicht installiert.');
      return false;
    }
    
    // Versuche, einen einfachen Tokenizer zu erstellen und zu testen
    try {
      const tokenizerExists = await DbClient.query(
        `SELECT tokenizer_exists('default_tokenizer') as exists`
      );
      
      // Wenn der Tokenizer nicht existiert, erstelle ihn
      if (!tokenizerExists.rows[0]?.exists) {
        await createSimpleTokenizer();
      }
      
      // Teste den Tokenizer und die BM25-Funktionalität
      await DbClient.query(
        `SELECT to_bm25vector(tokenize('BM25 Funktionalitätstest', 'default_tokenizer'))`
      );
      
      console.log('BM25-Funktionalität erfolgreich getestet.');
      return true;
    } catch (error) {
      console.error('Fehler beim Testen der BM25-Funktionalität:', error);
      return false;
    }
  } catch (error) {
    console.warn('BM25-Funktionalität nicht verfügbar:', error);
    return false;
  }
}

/**
 * Konfiguriert den BM25-Tokenizer in der Datenbank
 */
export async function configureBM25Tokenizer(
  options: {
    stopWords?: string[];
    language?: string;
    tokenizerName?: string;
  } = {}
): Promise<void> {
  const { 
    stopWords = [],
    language = 'german',
    tokenizerName = 'default_tokenizer'
  } = options;

  try {
    // Prüfe, ob der Tokenizer bereits existiert
    const tokenizerExists = await DbClient.query(
      `SELECT tokenizer_exists($1) as exists`,
      [tokenizerName]
    );
    
    // Wenn der Tokenizer nicht existiert, erstelle ihn
    if (!tokenizerExists.rows[0]?.exists) {
      await createSimpleTokenizer(language, tokenizerName);
    } else {
      console.log(`Tokenizer '${tokenizerName}' existiert bereits.`);
    }
    
    // Optional: Setze den Tokenizer als Standard, wenn er nicht bereits der Standard ist
    await DbClient.query(
      `SELECT set_default_tokenizer($1)`,
      [tokenizerName]
    );
    
    console.log(`BM25-Tokenizer '${tokenizerName}' für Sprache '${language}' konfiguriert.`);
  } catch (error) {
    console.warn('Fehler bei der BM25-Tokenizer-Konfiguration:', error);
    // Wir werfen den Fehler nicht, da dies möglicherweise nicht unterstützt wird
  }
}