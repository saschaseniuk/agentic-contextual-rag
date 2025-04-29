// src/rag/contextualizer.ts
import { TextChunk, ContextualizedChunk, ContextualizerOptions, SourceDocument } from '../lib/types';
import { generateText, createEmbedding, cacheDocument } from '../lib/vercelAI';
import { config } from '../lib/config';

// Cache für die Kontextualisierung, um wiederholte Anfragen zu vermeiden
const contextCache = new Map<string, string>();

// Cache für Dokument-Caching-IDs
const documentCacheMap = new Map<string, string>();

// Minimale Dokumentgröße für Caching (laut Google Gemini API)
const MIN_TOKENS_FOR_CACHING = 4096;

/**
 * Schätzt die Anzahl der Tokens in einem Text (grobe Schätzung)
 * @param text Der zu schätzende Text
 * @returns Die geschätzte Anzahl der Tokens
 */
function estimateTokenCount(text: string): number {
  // Einfache Faustregel: 1 Token ≈ ~4 Zeichen für englischen Text
  // Für andere Sprachen kann dies variieren
  return Math.ceil(text.length / 4);
}

/**
 * Erstellt einen kontextualisierten Chunk aus einem TextChunk
 * Generiert eine Zusammenfassung und erstellt das Embedding
 */
export async function contextualizeChunk(
  chunk: TextChunk,
  documentCacheId: string | null = null,
  options: ContextualizerOptions = config.rag.contextualizer
): Promise<ContextualizedChunk> {
  const { content } = chunk;
  
  // Generiere eine Zusammenfassung/Kontext für den Chunk
  const contextSummary = await generateContextSummary(content, documentCacheId, options);
  
  // Kombiniere die Zusammenfassung mit dem Original-Inhalt
  const contextualizedContent = `${contextSummary}\n\n${content}`;
  
  // Erstelle ein Embedding für den kontextualisierten Inhalt
  const embedding = await createEmbedding(contextualizedContent);
  
  return {
    ...chunk,
    contextSummary,
    contextualizedContent,
    embedding,
  };
}

/**
 * Verarbeitet mehrere Chunks eines Dokuments parallel
 * Nutzt das gecachte Dokument für effiziente Kontextualisierung, wenn möglich
 */
export async function contextualizeDocumentChunks(
  document: SourceDocument,
  chunks: TextChunk[],
  options: ContextualizerOptions = config.rag.contextualizer,
  batchSize = 5 // Begrenzt die Anzahl der gleichzeitigen API-Anfragen
): Promise<ContextualizedChunk[]> {
  // Cache das gesamte Dokument, wenn es groß genug ist
  let documentCacheId: string | null = null;
  
  // Schätzt die Anzahl der Tokens im Dokument
  const estimatedTokens = estimateTokenCount(document.content);
  
  if (estimatedTokens >= MIN_TOKENS_FOR_CACHING) {
    console.log(`Dokument "${document.source}" hat schätzungsweise ${estimatedTokens} Tokens, versuche Caching...`);
    // Prüfe, ob das Dokument bereits im Cache ist
    const cacheKey = `${document.source}-${document.content.substring(0, 100)}`;
    
    if (documentCacheMap.has(cacheKey)) {
      documentCacheId = documentCacheMap.get(cacheKey)!;
      console.log(`Dokument aus Cache geladen: ${documentCacheId}`);
    } else {
      // Versuche das Dokument zu cachen
      documentCacheId = await cacheDocument(document.content);
      
      // Wenn erfolgreich, speichere die ID im Cache
      if (documentCacheId) {
        documentCacheMap.set(cacheKey, documentCacheId);
      }
    }
  } else {
    console.log(`Dokument "${document.source}" zu klein für Caching (${estimatedTokens} Tokens < ${MIN_TOKENS_FOR_CACHING})`);
  }
  
  return contextualizeChunks(chunks, documentCacheId, options, batchSize);
}

/**
 * Verarbeitet mehrere Chunks parallel
 */
export async function contextualizeChunks(
  chunks: TextChunk[],
  documentCacheId: string | null = null,
  options: ContextualizerOptions = config.rag.contextualizer,
  batchSize = 5 // Begrenzt die Anzahl der gleichzeitigen API-Anfragen
): Promise<ContextualizedChunk[]> {
  const results: ContextualizedChunk[] = [];
  
  // Verarbeite die Chunks in Batches, um die API nicht zu überlasten
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchPromises = batch.map(chunk => contextualizeChunk(chunk, documentCacheId, options));
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Optional: Kleine Pause zwischen Batches, um Rate-Limits zu vermeiden
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Generiert eine Zusammenfassung oder kontextuelle Beschreibung für einen Chunk
 * Verwendet das gecachte Dokument, wenn verfügbar
 */
async function generateContextSummary(
  text: string,
  documentCacheId: string | null = null,
  options: ContextualizerOptions
): Promise<string> {
  const { maxTokens, temperature } = options;
  
  // Check, ob wir diesen Text bereits im Cache haben
  const cacheKey = `${text.substring(0, 100)}...${maxTokens}_${temperature}`;
  if (contextCache.has(cacheKey)) {
    return contextCache.get(cacheKey)!;
  }
  
  try {
    let prompt: string;
    let generateOptions: { temperature: number; maxOutputTokens: number; cachedContent?: string } = {
      temperature,
      maxOutputTokens: maxTokens
    };
    
    if (documentCacheId) {
      // Verwende das gecachte Dokument für die Kontextualisierung
      prompt = `
Hier ist der Chunk, den wir im Kontext des gesamten Dokuments situieren möchten:
<chunk>
${text}
</chunk>

Bitte erstelle eine kurze, prägnante Zusammenfassung (max. ${maxTokens} Token), die diesen Chunk im Kontext des gesamten Dokuments erklärt.
Die Zusammenfassung sollte:
1. Die wichtigsten Themen und Konzepte des Chunks identifizieren
2. Erklären, wie dieser Chunk mit dem Rest des Dokuments zusammenhängt
3. Wichtige Eigennamen, Fachbegriffe und Schlüsselreferenzen beibehalten
4. Mit einer kurzen Überschrift beginnen

Antworte nur mit der prägnanten Zusammenfassung und nichts anderem.`;
      
      // Füge die Caching-ID hinzu, wenn vorhanden
      generateOptions.cachedContent = documentCacheId;
    } else {
      // Fallback: Erstelle einen Prompt ohne gecachtes Dokument
      prompt = `
Du bist ein Experte für die Erstellung von präzisen, kompakten Zusammenfassungen von Textausschnitten.
Deine Aufgabe ist es, eine kurze, informative Zusammenfassung des folgenden Textausschnitts zu erstellen.
Die Zusammenfassung sollte:
1. Die Hauptthemen und Schlüsselbegriffe enthalten
2. Die wichtigsten Fakten und Zusammenhänge erfassen
3. Maximal ${maxTokens} Token lang sein
4. Die Semantik und Bedeutung des Ausschnitts präzise wiedergeben
5. Fachbegriffe und wichtige Eigennamen beibehalten

Dies dient dazu, den Textausschnitt für eine semantische Suche besser auffindbar zu machen.

Textausschnitt:
"""
${text}
"""

Erstelle eine prägnante Zusammenfassung, die mit einer kurzen Überschrift beginnt:`;
    }
    
    // Generiere die Zusammenfassung mit den entsprechenden Optionen
    const summary = await generateText(prompt, generateOptions);
    
    // Speichere die Zusammenfassung im Cache
    contextCache.set(cacheKey, summary);
    
    return summary;
  } catch (error) {
    console.error('Fehler bei der Kontextualisierung:', error);
    // Im Fehlerfall eine sehr einfache Zusammenfassung zurückgeben
    return `Themenzusammenfassung: ${text.substring(0, 50)}...`;
  }
}