// src/lib/vercelAI.ts
import { GoogleGenAI } from '@google/genai';
import { config } from './config';

// Hole die Modellnamen aus der Konfiguration (die aus .env geladen wird)
const GENERATION_MODEL = config.google.models.generation;
const EMBEDDING_MODEL = config.google.models.embedding;

console.log(`Verwende folgende Google AI Modelle:
- Generation: ${GENERATION_MODEL}
- Embedding: ${EMBEDDING_MODEL}`);

// Konfiguriere die Google Generative AI mit dem API-Key
export const googleAI = new GoogleGenAI(config.google.apiKey);

/**
 * Generiert Text mit dem Gemini-Modell
 * @param prompt Der Prompt für die Generierung
 * @param options Optionale Parameter wie Temperatur
 * @returns Generierter Text
 */
export async function generateText(
  prompt: string, 
  options: { temperature?: number; maxOutputTokens?: number; cachedContent?: string } = {}
): Promise<string> {
  try {
    const response = await googleAI.models.generateContent({
      model: GENERATION_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxOutputTokens,
        ...(options.cachedContent ? { cachedContent: options.cachedContent } : {})
      }
    });

    return response.response.text();
  } catch (error) {
    console.error('Fehler bei der Textgenerierung:', error);
    throw error;
  }
}

/**
 * Erstellt ein Embedding für einen Text
 * @param text Der zu embedende Text
 * @returns Ein Vektor-Embedding als Zahlenarray
 */
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await googleAI.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: {
        taskType: "SEMANTIC_SIMILARITY",
      }
    });

    if (!response.embeddings) {
      throw new Error('Keine embeddings-Eigenschaft in der Antwort gefunden');
    }

    return response.embeddings.values;
  } catch (error) {
    console.error('Fehler bei der Embedding-Erstellung:', error);
    throw error;
  }
}

/**
 * Erstellt Embeddings für mehrere Texte im Batch
 * @param texts Die zu embedenden Texte
 * @returns Ein Array von Vektor-Embeddings
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    // Momentan unterstützt die Google API kein direktes Batch-Embedding,
    // daher mappen wir die Texte und rufen für jeden einzeln createEmbedding auf
    const embeddings = await Promise.all(texts.map(text => createEmbedding(text)));
    return embeddings;
  } catch (error) {
    console.error('Fehler bei der Batch-Embedding-Erstellung:', error);
    throw error;
  }
}

/**
 * Führt eine asynchrone Funktion aus und verzögert die Ausführung bei Bedarf,
 * um eine Ratenbegrenzung einzuhalten
 * 
 * @param fn Die auszuführende Funktion
 * @param delayMs Die Verzögerung in Millisekunden
 * @param retries Anzahl der Wiederholungsversuche bei 429-Fehlern
 * @param retryDelayMs Verzögerung zwischen Wiederholungsversuchen
 * @returns Das Ergebnis der Funktion
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  delayMs: number = 500,
  retries: number = 3,
  retryDelayMs: number = 2000
): Promise<T> {
  // Verzögere die Ausführung um die angegebene Zeit
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  try {
    // Führe die Funktion aus
    return await fn();
  } catch (error) {
    // Prüfe, ob es sich um einen 429-Fehler (Too Many Requests) handelt
    if (
      retries > 0 &&
      error instanceof Error &&
      (
        error.toString().includes('429') ||
        error.toString().includes('Too Many Requests') ||
        error.toString().includes('RESOURCE_EXHAUSTED')
      )
    ) {
      console.warn(`Rate limit erreicht, warte ${retryDelayMs}ms und versuche es erneut (${retries} Versuche übrig)...`);
      
      // Warte länger bei einem Rate-Limit-Fehler
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      
      // Versuche es erneut mit einem Wiederholungsversuch weniger
      return withRateLimit(fn, delayMs, retries - 1, retryDelayMs * 2);
    }
    
    // Bei anderen Fehlern, wirf den Fehler weiter
    throw error;
  }
}