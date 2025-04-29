// src/rag/contextualizer.ts
import { TextChunk, ContextualizedChunk, ContextualizerOptions, SourceDocument } from '../lib/types';
import { generateText, createEmbedding } from '../lib/vercelAI';
import { GoogleGenAI } from '@google/genai';
import { config } from '../lib/config';

// Cache für die Kontextualisierung, um wiederholte Anfragen zu vermeiden
const contextCache = new Map<string, string>();

// Google GenAI Client für direkten API-Zugriff
const googleGenAI = new GoogleGenAI({ apiKey: config.google.apiKey });

// Cache für Dokument-Caching-IDs
const documentCacheMap = new Map<string, string>();

// Hole die Modellnamen aus der Konfiguration (die aus .env geladen wird)
const GENERATION_MODEL = config.google.models.generation;
const CACHING_MODEL = config.google.models.generation;

/**
 * Erstellt einen Cache-Eintrag für ein ganzes Dokument
 * @param document Das zu cachende Dokument
 * @returns Die Cache-ID, die für die Generierung von Kontext verwendet werden kann
 */
export async function cacheDocument(document: SourceDocument): Promise<string | null> {
  try {
    // Prüfe, ob das Dokument bereits im Cache ist
    const cacheKey = `${document.source}-${document.content.substring(0, 100)}`;
    if (documentCacheMap.has(cacheKey)) {
      return documentCacheMap.get(cacheKey)!;
    }
    
    // Das neue SDK verwendet einen anderen Ansatz für Caching
    // Wir verwenden das in der config definierte Modell
    const modelName = CACHING_MODEL;
    
    console.log(`Erstelle Cache-Eintrag für Dokument "${document.source}" mit Modell ${modelName}`);
    
    // Erstelle Cache-Eintrag mit dem neuen SDK
    const cache = await googleGenAI.caches.create({
      model: modelName,
      config: {
        contents: [
          {
            role: 'user',
            parts: [{ text: `<document>\n${document.content}\n</document>` }],
          }
        ],
        // TTL in Sekunden (1 Stunde)
        ttlSeconds: 60 * 60
      }
    });
    
    // Speichere die Cache-ID für spätere Verwendung
    if (cache && cache.name) {
      documentCacheMap.set(cacheKey, cache.name);
      console.log(`Dokument gecached mit ID: ${cache.name}`);
      return cache.name;
    }
    
    console.warn('Dokument-Caching fehlgeschlagen: Keine Cache-ID erhalten');
    return null;
  } catch (error) {
    console.error('Fehler beim Caching des Dokuments:', error);
    return null;
  }
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
 * Nutzt das gecachte Dokument für effiziente Kontextualisierung
 */
export async function contextualizeDocumentChunks(
  document: SourceDocument,
  chunks: TextChunk[],
  options: ContextualizerOptions = config.rag.contextualizer,
  batchSize = 5 // Begrenzt die Anzahl der gleichzeitigen API-Anfragen
): Promise<ContextualizedChunk[]> {
  // Cache das gesamte Dokument, wenn möglich
  const documentCacheId = await cacheDocument(document);
  
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
    let summary: string;
    
    if (documentCacheId) {
      // Verwende das gecachte Dokument für die Kontextualisierung
      const model = googleGenAI.models.getGenerativeModel({
        model: GENERATION_MODEL
      });
      
      // Erstelle einen Prompt für die Kontextualisierung
      const promptWithCachedDocument = `
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
      
      // Generiere die Zusammenfassung mit dem gecachten Dokument
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: promptWithCachedDocument }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          cachedContent: documentCacheId
        }
      });
      
      summary = result.response.text();
    } else {
      // Fallback: Erstelle einen Prompt ohne gecachtes Dokument
      const prompt = `
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

      // Generiere die Zusammenfassung mit Gemini über die Standard-Methode
      summary = await generateText(prompt, {
        temperature,
        maxOutputTokens: maxTokens,
      });
    }
    
    // Speichere die Zusammenfassung im Cache
    contextCache.set(cacheKey, summary);
    
    return summary;
  } catch (error) {
    console.error('Fehler bei der Kontextualisierung:', error);
    // Im Fehlerfall eine sehr einfache Zusammenfassung zurückgeben
    return `Themenzusammenfassung: ${text.substring(0, 50)}...`;
  }
}