// src/db/elasticsearch/indices.ts
import { elasticsearchClient, ESClient } from './client';
import { config } from '../../lib/config';

// Name des Haupt-Index für Dokumente
export const DOCUMENTS_INDEX = 'contextual_documents';

/**
 * Erstellt den Index für kontextualisierte Dokumente mit deutschem Analyzer
 * 
 * Diese Konfiguration unterstützt optimales BM25 Ranking speziell für deutsche Inhalte
 * mit Custom Analyzer und Filter-Konfiguration
 */
export async function setupDocumentsIndex(): Promise<boolean> {
  try {
    // Prüfe, ob der Index bereits existiert
    const indexExists = await ESClient.indexExists(DOCUMENTS_INDEX);
    
    if (indexExists) {
      console.log(`Index ${DOCUMENTS_INDEX} existiert bereits.`);
      return true;
    }
    
    // Erstelle den Index mit spezifischen Mappings und Settings
    await elasticsearchClient.indices.create({
      index: DOCUMENTS_INDEX,
      settings: {
        analysis: {
          analyzer: {
            german_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: [
                'lowercase',
                'german_normalization',
                'german_stemmer',
                'german_stop'
              ]
            },
            // Zusätzlicher Analyzer für exakte Matches
            keyword_analyzer: {
              type: 'custom',
              tokenizer: 'keyword',
              filter: ['lowercase']
            }
          },
          filter: {
            german_stop: {
              type: 'stop',
              stopwords: '_german_'
            },
            german_stemmer: {
              type: 'stemmer',
              language: 'german'
            }
          }
        },
        // Konfiguriert die BM25-Parameter für optimale Performance
        // Diese Parameter können je nach Bedarf angepasst werden
        similarity: {
          german_bm25: {
            type: 'BM25',
            b: 0.75, // Länge-Normalisierungsfaktor
            k1: 1.2  // Term-Frequenz-Skalierungsfaktor
          }
        }
      },
      mappings: {
        properties: {
          // Quelle des Dokuments
          source: {
            type: 'keyword',
            index: true
          },
          // Original Text des Chunks
          content: {
            type: 'text',
            analyzer: 'german_analyzer',
            similarity: 'german_bm25',
            fields: {
              keyword: {
                type: 'text',
                analyzer: 'keyword_analyzer'
              }
            }
          },
          // Generierte Zusammenfassung/Kontext
          context_summary: {
            type: 'text',
            analyzer: 'german_analyzer',
            similarity: 'german_bm25'
          },
          // Kombinierter Text (Kontext + Original)
          contextualized_content: {
            type: 'text',
            analyzer: 'german_analyzer',
            similarity: 'german_bm25',
            fields: {
              keyword: {
                type: 'text',
                analyzer: 'keyword_analyzer'
              }
            }
          },
          // Index des Chunks im Quelldokument
          chunk_index: {
            type: 'integer'
          },
          // Zusätzliche Metadaten als verschachteltes Objekt
          metadata: {
            type: 'object',
            enabled: true,
            // Spezifische Felder, die wir vielleicht indexieren wollen
            properties: {
              fileName: { type: 'keyword' },
              fileSize: { type: 'long' },
              lastModified: { type: 'date' }
              // Weitere Metadaten-Felder können hier hinzugefügt werden
            }
          }
        }
      }
    });
    
    console.log(`Index ${DOCUMENTS_INDEX} erfolgreich erstellt mit deutschem Analyzer und BM25-Konfiguration.`);
    return true;
  } catch (error) {
    console.error('Fehler beim Einrichten des Elasticsearch-Index:', error);
    return false;
  }
}

/**
 * Löscht und erstellt den Index neu (für Entwicklung/Reset)
 */
export async function resetDocumentsIndex(): Promise<boolean> {
  try {
    await ESClient.deleteIndex(DOCUMENTS_INDEX);
    return await setupDocumentsIndex();
  } catch (error) {
    console.error('Fehler beim Zurücksetzen des Index:', error);
    return false;
  }
}