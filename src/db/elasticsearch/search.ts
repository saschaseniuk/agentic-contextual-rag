// src/db/elasticsearch/search.ts
import { elasticsearchClient } from './client';
import { DOCUMENTS_INDEX } from './indices';
import { ChunkSearchResult } from '../../lib/types';

/**
 * Führt eine BM25-basierte Volltextsuche in Elasticsearch durch
 * Sucht primär im kontextualisierten Inhalt
 */
export async function searchWithBM25(
  query: string,
  options: {
    limit?: number;
    minScore?: number;
    fields?: string[];
    highlightFields?: string[];
  } = {}
): Promise<ChunkSearchResult[]> {
  const {
    limit = 10,
    minScore = 0.1,
    fields = ['contextualized_content^2', 'content', 'context_summary^1.5'],
    highlightFields = ['contextualized_content', 'content']
  } = options;

  try {
    // Erstelle eine Multi-Match Query für BM25-Suche
    const searchResult = await elasticsearchClient.search({
      index: DOCUMENTS_INDEX,
      body: {
        // Größenbegrenzung
        size: limit,
        
        // Minimaler Score-Filter, um nur relevante Ergebnisse zu erhalten
        min_score: minScore,
        
        // Suchabfrage
        query: {
          multi_match: {
            query: query,
            fields: fields,
            type: 'best_fields',
            // Erhöht die Toleranz für Tippfehler und Ähnliches
            fuzziness: 'AUTO',
            // Erlaube 50% der Terme zu fehlen
            minimum_should_match: '50%'
          }
        },
        
        // Hervorhebung der Suchbegriffe im Text
        highlight: {
          fields: Object.fromEntries(
            highlightFields.map(field => [field, { number_of_fragments: 3 }])
          ),
          pre_tags: ['<mark>'],
          post_tags: ['</mark>']
        }
      }
    });
    
    // Konvertiere die Elasticsearch-Ergebnisse in unser einheitliches Format
    const results: ChunkSearchResult[] = searchResult.hits.hits.map(hit => {
      const source = hit._source as any;
      
      const result: ChunkSearchResult = {
        id: parseInt(hit._id, 10) || 0,
        source: source.source || '',
        content: source.content || '',
        contextSummary: source.context_summary || '',
        contextualizedContent: source.contextualized_content || '',
        score: hit._score || 0,
        metadata: source.metadata || {}
      };
      
      // Füge Highlighting hinzu, wenn verfügbar
      if (hit.highlight) {
        result.highlights = hit.highlight;
      }
      
      return result;
    });
    
    return results;
  } catch (error) {
    console.error('Fehler bei der Elasticsearch-Suche:', error);
    return [];
  }
}

/**
 * Erweiterte Suche mit kombinierter Abfragestrategie
 * Nutzt Query Expansion und Boosting für präzisere Ergebnisse
 */
export async function searchAdvanced(
  query: string,
  options: {
    limit?: number;
    boostFields?: Record<string, number>;
    useKeywords?: boolean;
  } = {}
): Promise<ChunkSearchResult[]> {
  const {
    limit = 10,
    boostFields = {
      'contextualized_content': 2,
      'context_summary': 1.5,
      'content': 1
    },
    useKeywords = true
  } = options;

  // Extrahiere potenzielle Schlüsselwörter aus der Anfrage (einfache Implementierung)
  const keywords = useKeywords 
    ? query.split(/\s+/).filter(word => word.length > 3).map(word => word.toLowerCase())
    : [];

  try {
    const searchResult = await elasticsearchClient.search({
      index: DOCUMENTS_INDEX,
      body: {
        size: limit,
        query: {
          // Kombiniere mehrere Abfragen mit boolescher Logik
          bool: {
            // Relevante Dokumente müssen diese Bedingung erfüllen
            must: [
              {
                multi_match: {
                  query: query,
                  fields: Object.entries(boostFields).map(([field, boost]) => `${field}^${boost}`),
                  type: 'best_fields',
                  minimum_should_match: '50%'
                }
              }
            ],
            // Diese Bedingungen erhöhen den Score, sind aber nicht erforderlich
            should: [
              // Exakte Phrasen-Matches bekommen einen Boost
              {
                multi_match: {
                  query: query,
                  fields: Object.keys(boostFields),
                  type: 'phrase',
                  boost: 2.0
                }
              },
              // Wenn wir Schlüsselwörter haben, suchen wir auch nach diesen
              ...(keywords.length > 0 ? [
                {
                  terms: {
                    'contextualized_content.keyword': keywords,
                    boost: 1.5
                  }
                }
              ] : [])
            ]
          }
        },
        highlight: {
          fields: {
            'contextualized_content': { number_of_fragments: 3 },
            'content': { number_of_fragments: 2 }
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>']
        }
      }
    });

    // Konvertiere die Elasticsearch-Ergebnisse
    const results: ChunkSearchResult[] = searchResult.hits.hits.map(hit => {
      const source = hit._source as any;
      
      return {
        id: parseInt(hit._id, 10) || 0,
        source: source.source || '',
        content: source.content || '',
        contextSummary: source.context_summary || '',
        contextualizedContent: source.contextualized_content || '',
        score: hit._score || 0,
        metadata: source.metadata || {},
        highlights: hit.highlight || {}
      };
    });
    
    return results;
  } catch (error) {
    console.error('Fehler bei der erweiterten Elasticsearch-Suche:', error);
    return [];
  }
}