#!/usr/bin/env node
// src/scripts/ingest.ts
import fs from 'fs/promises';
import path from 'path';
import { config } from '../lib/config';
import { chunkText } from '../rag/chunking';
import { contextualizeDocumentChunks } from '../rag/contextualizer';
import { DbClient } from '../db/client';
import { DocumentsStore } from '../db/schema';
import { testBM25Functionality, configureBM25Tokenizer } from '../rag/tokenizer.config';
import { SourceDocument } from '../lib/types';

/**
 * Hauptfunktion zum Laden und Verarbeiten von Markdown-Dateien
 */
async function ingestMarkdownFiles() {
  try {
    console.log('Starte Ingest-Prozess für Markdown-Dateien...');
    
    // Teste die Datenbankverbindung
    const dbConnected = await DbClient.testConnection();
    if (!dbConnected) {
      console.error('Datenbankverbindung konnte nicht hergestellt werden.');
      process.exit(1);
    }
    
    // Prüfe das Datenbankschema
    const schemaValid = await DocumentsStore.verifySchema();
    if (!schemaValid) {
      console.error('Das Datenbankschema entspricht nicht den Erwartungen.');
      process.exit(1);
    }
    
    // Teste die BM25-Funktionalität
    const bm25Available = await testBM25Functionality();
    if (bm25Available) {
      console.log('BM25-Funktionalität ist verfügbar.');
      await configureBM25Tokenizer({ language: 'german' });
    } else {
      console.warn('BM25-Funktionalität ist nicht verfügbar. Das System wird ohne BM25-Vektoren arbeiten.');
    }
    
    // Lade die Markdown-Dateien aus dem Datenverzeichnis
    const files = await loadMarkdownFiles(config.rag.paths.dataDir);
    console.log(`${files.length} Markdown-Dateien gefunden.`);
    
    // Verarbeite jede Datei
    let totalChunks = 0;
    for (const file of files) {
      console.log(`Verarbeite Datei: ${file.source}`);
      
      // Teile den Inhalt in Chunks
      const chunks = chunkText(file);
      console.log(`Datei in ${chunks.length} Chunks aufgeteilt.`);
      
      // Kontextualisiere die Chunks mit dem gesamten Dokument als Kontext
      console.log('Erstelle Kontextualisierungen und Embeddings mit Document Caching...');
      const contextualizedChunks = await contextualizeDocumentChunks(file, chunks);
      
      // Speichere die kontextualisierten Chunks in der Datenbank
      console.log('Speichere in der Datenbank...');
      for (const chunk of contextualizedChunks) {
        if (bm25Available) {
          await DocumentsStore.saveChunkWithBM25(chunk);
        } else {
          await DocumentsStore.saveContextualizedChunk(chunk);
        }
      }
      
      totalChunks += contextualizedChunks.length;
      console.log(`Datei erfolgreich verarbeitet: ${file.source}`);
    }
    
    console.log(`Ingest-Prozess abgeschlossen. ${totalChunks} Chunks verarbeitet und in der Datenbank gespeichert.`);
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