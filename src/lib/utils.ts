// src/lib/utils.ts

/**
 * Hilfsfunktionen für das Projekt
 */

/**
 * Schätzt die Anzahl der Tokens in einem Text (grobe Schätzung)
 * @param text Der zu schätzende Text
 * @returns Die geschätzte Anzahl der Tokens
 */
export function estimateTokenCount(text: string): number {
    // Einfache Faustregel: 1 Token ≈ ~4 Zeichen für englischen Text
    // Für andere Sprachen kann dies variieren
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Schätzt die Anzahl der Tokens in einem Text basierend auf Wörtern (genauer)
   * @param text Der zu schätzende Text
   * @returns Die geschätzte Anzahl der Tokens
   */
  export function estimateTokenCountByWords(text: string): number {
    // Zähle die Anzahl der Wörter (durch Leerzeichen getrennt)
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // Schätze die Anzahl der Tokens (ca. 1.3 Tokens pro Wort für Englisch)
    // Dieser Wert kann je nach Sprache und Modell variieren
    return Math.ceil(wordCount * 1.3);
  }
  
  /**
   * Teilt einen Text in Chunks einer bestimmten maximalen Größe
   * @param text Der zu teilende Text
   * @param maxTokens Die maximale Anzahl von Tokens pro Chunk
   * @returns Ein Array von Text-Chunks
   */
  export function splitTextIntoChunks(text: string, maxTokens: number = 1000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\s*\n/); // Teile nach Absätzen
    
    let currentChunk = '';
    let currentTokenCount = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphTokens = estimateTokenCount(paragraph);
      
      // Wenn der Absatz zu groß ist, teile ihn weiter auf
      if (paragraphTokens > maxTokens) {
        // Füge den aktuellen Chunk hinzu, wenn er nicht leer ist
        if (currentTokenCount > 0) {
          chunks.push(currentChunk);
          currentChunk = '';
          currentTokenCount = 0;
        }
        
        // Teile den Absatz in Sätze
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        
        for (const sentence of sentences) {
          const sentenceTokens = estimateTokenCount(sentence);
          
          // Wenn der Satz in den aktuellen Chunk passt
          if (currentTokenCount + sentenceTokens <= maxTokens) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
            currentTokenCount += sentenceTokens;
          } else {
            // Wenn der aktuelle Chunk nicht leer ist, füge ihn hinzu
            if (currentTokenCount > 0) {
              chunks.push(currentChunk);
              currentChunk = '';
            }
            
            // Wenn der Satz selbst zu groß ist, teile ihn weiter auf
            if (sentenceTokens > maxTokens) {
              const words = sentence.split(/\s+/);
              currentChunk = '';
              currentTokenCount = 0;
              
              for (const word of words) {
                const wordTokens = estimateTokenCount(word);
                
                if (currentTokenCount + wordTokens <= maxTokens) {
                  currentChunk += (currentChunk ? ' ' : '') + word;
                  currentTokenCount += wordTokens;
                } else {
                  chunks.push(currentChunk);
                  currentChunk = word;
                  currentTokenCount = wordTokens;
                }
              }
            } else {
              // Starte einen neuen Chunk mit diesem Satz
              currentChunk = sentence;
              currentTokenCount = sentenceTokens;
            }
          }
        }
      } else {
        // Wenn der Absatz plus aktueller Chunk die maximale Größe überschreitet
        if (currentTokenCount + paragraphTokens > maxTokens) {
          // Füge den aktuellen Chunk hinzu und starte einen neuen
          chunks.push(currentChunk);
          currentChunk = paragraph;
          currentTokenCount = paragraphTokens;
        } else {
          // Füge den Absatz zum aktuellen Chunk hinzu
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          currentTokenCount += paragraphTokens;
        }
      }
    }
    
    // Füge den letzten Chunk hinzu, wenn er nicht leer ist
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  /**
   * Berechnet die Ähnlichkeit zwischen zwei Texten (Jaccard-Ähnlichkeit)
   * @param textA Erster Text
   * @param textB Zweiter Text
   * @returns Ähnlichkeitswert zwischen 0 und 1
   */
  export function calculateTextSimilarity(textA: string, textB: string): number {
    // Tokenisiere die Texte in Wörter
    const wordsA = new Set(textA.toLowerCase().split(/\W+/).filter(word => word.length > 0));
    const wordsB = new Set(textB.toLowerCase().split(/\W+/).filter(word => word.length > 0));
    
    // Berechne Schnittmenge und Vereinigungsmenge
    const intersection = new Set([...wordsA].filter(word => wordsB.has(word)));
    const union = new Set([...wordsA, ...wordsB]);
    
    // Berechne Jaccard-Ähnlichkeit
    return intersection.size / union.size;
  }
  
  /**
   * Entfernt Markdown-Syntax aus einem Text
   * @param markdown Der Markdown-Text
   * @returns Einfacher Text ohne Markdown-Syntax
   */
  export function removeMarkdown(markdown: string): string {
    let text = markdown;
    
    // Entferne Codeblöcke
    text = text.replace(/```[\s\S]*?```/g, '');
    
    // Entferne Inline-Code
    text = text.replace(/`[^`]*`/g, '');
    
    // Entferne Überschriften
    text = text.replace(/^#{1,6}\s+/gm, '');
    
    // Entferne Links
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Entferne Bilder
    text = text.replace(/!\[([^\]]+)\]\([^)]+\)/g, '');
    
    // Entferne Fettschrift und Kursivschrift
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');
    
    // Entferne HTML-Tags
    text = text.replace(/<[^>]*>/g, '');
    
    // Entferne mehrere Leerzeilen
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text.trim();
  }