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
export const googleAI = new GoogleGenAI({
  apiKey: config.google.apiKey
});

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
    const model = googleAI.models.getGenerativeModel({ 
      model: GENERATION_MODEL
    });

    const generationConfig = {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens,
      ...(options.cachedContent ? { cachedContent: options.cachedContent } : {})
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig
    });

    return result.response.text();
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
    const model = googleAI.models.getGenerativeModel({
      model: EMBEDDING_MODEL
    });

    const embeddingResult = await model.embedContent({
      content: [{ role: "user", parts: [{ text }] }]
    });

    return embeddingResult.embedding.values;
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