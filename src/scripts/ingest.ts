#!/usr/bin/env node
// src/scripts/ingest.ts
import fs from 'fs/promises';
import path from 'path';
import { config } from '../lib/config';
import { chunkText } from '../rag/chunking';
import { contextualizeDocumentChunks } from '../rag/contextualizer';
import { DbClient } from '../db/client';
import { DocumentsStore } from '../db/schema';
import { ESClient } from '../db/elasticsearch/client';
import { DOCUMENTS_INDEX, setupDocumentsIndex } from '../db/elasticsearch/indices';
import { elasticsearchClient } from '../db/elasticsearch/client';
import { SourceDocument, ContextualizedChunk } from '../lib/types';

/**
 * Speichert einen kontextualisierten Chunk in Elasticsearch
 */
async function saveToElasticsearch(chunk: ContextualizedChunk): Promise<string> {
  try {
    const {
      source,
      content,
      contextSummary,
      contextualizedContent,
      chunkIndex,
      metadata
    } = chunk;

    // Erstelle das Dokument für Elasticsearch
    const response = await elasticsearchClient.index({
      index: DOCUMENTS_INDEX,
      document: {
        source,
        content,
        context_summary: contextSummary,
        contextualized_content: contextualizedContent,
        chunk_index: chunkIndex,
        metadata
      },
      refresh: true // Stelle sicher, dass das Dokument sofort in der Suche verfügbar ist
    });

    return response._id;
  } catch (error) {
    console.error('Fehler beim Speichern des Chunks in Elasticsearch:', error);
    throw error;
  }
}

/**
 * Hauptfunktion zum Laden und Verarbeiten von Markdown-Dateien
 */
async function ingestMarkdownFiles() {
  try {
    console.log('Starte Ingest-Prozess für Markdown-Dateien...');
    
    // 1. Teste die Datenbankverbindungen
    console.log('Teste Datenbankverbindungen...');
    
    // PostgreSQL testen
    const pgConnected = await DbClient.testConnection();
    if (!pgConnected) {
      console.error('PostgreSQL-Verbindung konnte nicht hergestellt werden.');
      process.exit(1);
    }
    console.log('✅ PostgreSQL-Verbindung erfolgreich');
    
    // Elasticsearch testen
    const esConnected = await ESClient.testConnection();
    if (!esConnected) {
      console.error('Elasticsearch-Verbindung konnte nicht hergestellt werden.');
      process.exit(1);
    }
    console.log('✅ Elasticsearch-Verbindung erfolgreich');
    
    // 2. Prüfe das PostgreSQL-Schema
    const schemaValid = await DocumentsStore.verifySchema();
    if (!schemaValid) {
      console.error('Das PostgreSQL-Schema entspricht nicht den Erwartungen.');
      process.exit(1);
    }
    console.log('✅ PostgreSQL-Schema ist gültig');
    
    // 3. Stelle sicher, dass der Elasticsearch-Index existiert
    console.log('Prüfe Elasticsearch-Index...');
    const indexExists = await ESClient.indexExists(DOCUMENTS_INDEX);
    if (!indexExists) {
      console.log(`Index ${DOCUMENTS_INDEX} existiert nicht, wird erstellt...`);
      const indexCreated = await setupDocumentsIndex();
      if (!indexCreated) {
        console.error('Fehler beim Erstellen des Elasticsearch-Index.');
        process.exit(1);
      }
      console.log(`✅ Index ${DOCUMENTS_INDEX} erfolgreich erstellt`);
    } else {
      console.log(`✅ Index ${DOCUMENTS_INDEX} existiert bereits`);
    }
    
    // 4. Lade die Markdown-Dateien aus dem Datenverzeichnis
    const files = await loadMarkdownFiles(config.rag.paths.dataDir);
    console.log(`${files.length} Markdown-Dateien gefunden.`);
    
    // 5. Verarbeite jede Datei
    let totalChunks = 0;
    for (const file of files) {
      console.log(`\nVerarbeite Datei: ${file.source}`);
      
      // Teile den Inhalt in Chunks
      const chunks = chunkText(file);
      console.log(`Datei in ${chunks.length} Chunks aufgeteilt.`);
      
      // Kontextualisiere die Chunks mit dem gesamten Dokument als Kontext
      console.log('Erstelle Kontextualisierungen und Embeddings mit Document Caching...');
      const contextualizedChunks = await contextualizeDocumentChunks(file, chunks);
      
      // Speichere die kontextualisierten Chunks in beiden Datenbanken
      console.log('Speichere in PostgreSQL und Elasticsearch...');
      
      for (const chunk of contextualizedChunks) {
        try {
          // 1. Speichere in Elasticsearch
          const esId = await saveToElasticsearch(chunk);
          
          // 2. Speichere in PostgreSQL mit Referenz auf Elasticsearch-ID
          await DocumentsStore.saveContextualizedChunkWithESRef(chunk, esId);
          
        } catch (error) {
          console.error(`Fehler beim Speichern von Chunk ${chunk.chunkIndex}:`, error);
        }
      }
      
      totalChunks += contextualizedChunks.length;
      console.log(`Datei erfolgreich verarbeitet: ${file.source}`);
    }
    
    console.log(`\nIngest-Prozess abgeschlossen. ${totalChunks} Chunks verarbeitet und in beiden Datenbanken gespeichert.`);
  } catch (error) {
    console.error('Fehler im Ingest-Prozess:', error);
    process.exit(1);
  }
}

/**
 * Lädt alle Markdown-Dateien aus einem Verzeichnis
 */
async function loadMarkdownFiles(dirPath: string): Promise<SourceDocument[]> {
  const files: SourceDocument[] = [];
  
  try {
    // Prüfe, ob das Verzeichnis existiert
    await fs.access(dirPath).catch(() => {
      console.log(`Verzeichnis ${dirPath} existiert nicht, erstelle es...`);
      return fs.mkdir(dirPath, { recursive: true });
    });
    
    // Lese alle Dateien im Verzeichnis
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Rekursiv Unterverzeichnisse durchsuchen
        const subDirFiles = await loadMarkdownFiles(fullPath);
        files.push(...subDirFiles);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
        // Markdown-Datei gefunden
        const content = await fs.readFile(fullPath, 'utf-8');
        
        files.push({
          source: fullPath,
          content,
          metadata: {
            fileName: entry.name,
            fileSize: content.length,
            lastModified: (await fs.stat(fullPath)).mtime.toISOString()
          }
        });
      }
    }
    
    return files;
  } catch (error) {
    console.error(`Fehler beim Laden der Markdown-Dateien aus ${dirPath}:`, error);
    return [];
  }
}

// Führe das Skript aus
ingestMarkdownFiles()
  .then(() => {
    console.log('Ingest-Skript erfolgreich ausgeführt.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fehler beim Ausführen des Ingest-Skripts:', error);
    process.exit(1);
  });