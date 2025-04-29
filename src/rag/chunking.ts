// src/rag/chunking.ts
import { ChunkingOptions, SourceDocument, TextChunk } from '../lib/types';
import { config } from '../lib/config';

/**
 * Teilt einen Text in Chunks basierend auf der angegebenen Strategie
 */
export function chunkText(
  document: SourceDocument,
  options: ChunkingOptions = config.rag.chunking
): TextChunk[] {
  const { content, source, metadata } = document;
  const { maxChunkSize, chunkOverlap, strategy } = options;

  // Validierung der Eingabe
  if (!content || content.trim().length === 0) {
    return [];
  }

  let chunks: TextChunk[] = [];

  switch (strategy) {
    case 'character':
      chunks = chunkByCharacter(content, maxChunkSize, chunkOverlap);
      break;
    case 'sentence':
      chunks = chunkBySentence(content, maxChunkSize, chunkOverlap);
      break;
    case 'paragraph':
      chunks = chunkByParagraph(content, maxChunkSize, chunkOverlap);
      break;
    default:
      console.warn(`Unknown chunking strategy: ${strategy}, falling back to paragraph`);
      chunks = chunkByParagraph(content, maxChunkSize, chunkOverlap);
  }

  // Füge Metadaten zu jedem Chunk hinzu
  return chunks.map((chunk, index) => ({
    ...chunk,
    source,
    chunkIndex: index,
    metadata: { ...metadata },
  }));
}

/**
 * Teilt einen Text in Chunks basierend auf Zeichengrenzen
 */
function chunkByCharacter(text: string, maxSize: number, overlap: number): TextChunk[] {
  const chunks: TextChunk[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + maxSize, text.length);
    
    chunks.push({
      source: '',  // Wird später gesetzt
      content: text.substring(startIndex, endIndex),
      chunkIndex: chunks.length,
    });

    // Berechne den nächsten Startindex mit Überlappung
    startIndex = endIndex - overlap;
    
    // Verhindere Endlosschleifen, wenn die Überlappung zu groß ist
    if (startIndex <= 0 || startIndex >= text.length - 1) {
      break;
    }
  }

  return chunks;
}

/**
 * Teilt einen Text in Chunks basierend auf Satzgrenzen
 */
function chunkBySentence(text: string, maxSize: number, overlap: number): TextChunk[] {
  // Teile den Text in Sätze
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: TextChunk[] = [];
  
  let currentChunk = '';
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    // Wenn der aktuelle Chunk plus den nächsten Satz die maximale Größe überschreitet
    if (currentChunk.length + sentence.length > maxSize && currentChunk.length > 0) {
      // Speichere den aktuellen Chunk
      chunks.push({
        source: '',  // Wird später gesetzt
        content: currentChunk,
        chunkIndex: chunks.length,
      });
      
      // Füge Überlappung hinzu, indem wir zurückgehen und Sätze nehmen, bis wir nahe an der Überlappungsgröße sind
      let overlapText = '';
      let j = i - 1;
      
      while (j >= 0 && overlapText.length < overlap) {
        overlapText = sentences[j] + overlapText;
        j--;
      }
      
      // Starte einen neuen Chunk mit der Überlappung
      currentChunk = overlapText;
    }
    
    // Füge den aktuellen Satz zum Chunk hinzu
    currentChunk += sentence;
  }
  
  // Füge den letzten Chunk hinzu, wenn er nicht leer ist
  if (currentChunk.length > 0) {
    chunks.push({
      source: '',  // Wird später gesetzt
      content: currentChunk,
      chunkIndex: chunks.length,
    });
  }
  
  return chunks;
}

/**
 * Teilt einen Text in Chunks basierend auf Absatzgrenzen
 */
function chunkByParagraph(text: string, maxSize: number, overlap: number): TextChunk[] {
  // Teile den Text in Absätze (leere Zeilen als Trennzeichen)
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: TextChunk[] = [];
  
  let currentChunk = '';
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    // Überspringe leere Absätze
    if (paragraph.length === 0) {
      continue;
    }
    
    // Wenn der Absatz selbst zu groß ist, teile ihn in Sätze
    if (paragraph.length > maxSize) {
      const sentenceChunks = chunkBySentence(paragraph, maxSize, overlap);
      chunks.push(...sentenceChunks);
      continue;
    }
    
    // Wenn der aktuelle Chunk plus der nächste Absatz die maximale Größe überschreitet
    if (currentChunk.length + paragraph.length + 2 > maxSize && currentChunk.length > 0) {
      // Speichere den aktuellen Chunk
      chunks.push({
        source: '',  // Wird später gesetzt
        content: currentChunk,
        chunkIndex: chunks.length,
      });
      
      // Für die Überlappung: Füge so viele vorherige Absätze hinzu, bis wir nahe an der Überlappungsgröße sind
      let overlapText = '';
      let j = i - 1;
      
      while (j >= 0 && overlapText.length < overlap) {
        // Füge einen Absatz nur hinzu, wenn er plus dem aktuellen Überlappungstext die Überlappungsgröße nicht überschreitet
        const nextParagraph = paragraphs[j].trim();
        if (overlapText.length + nextParagraph.length + 2 <= overlap) {
          overlapText = nextParagraph + (overlapText.length > 0 ? '\n\n' : '') + overlapText;
        }
        j--;
      }
      
      // Starte einen neuen Chunk mit der Überlappung
      currentChunk = overlapText;
    }
    
    // Füge den aktuellen Absatz zum Chunk hinzu
    currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
  }
  
  // Füge den letzten Chunk hinzu, wenn er nicht leer ist
  if (currentChunk.length > 0) {
    chunks.push({
      source: '',  // Wird später gesetzt
      content: currentChunk,
      chunkIndex: chunks.length,
    });
  }
  
  return chunks;
}