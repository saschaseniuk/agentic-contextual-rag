#!/usr/bin/env node
// src/scripts/test-bm25.ts
import { DbClient } from '../db/client';
import { config } from '../lib/config';
import { testBM25Functionality, configureBM25Tokenizer } from '../rag/tokenizer.config';

/**
 * Test-Skript für BM25-Funktionalität
 */
async function testBM25() {
  console.log('🔍 Starte BM25-Funktionalitätstest...');
  
  try {
    // 1. Teste die Datenbankverbindung
    console.log('\n📊 Datenbank-Konfiguration:');
    console.log(`   Host: ${config.database.host}`);
    console.log(`   Port: ${config.database.port}`);
    console.log(`   Name: ${config.database.name}`);
    console.log(`   User: ${config.database.user}`);
    
    const dbConnected = await DbClient.testConnection();
    if (!dbConnected) {
      console.error('❌ Datenbankverbindung konnte nicht hergestellt werden.');
      process.exit(1);
    }
    console.log('✅ Datenbankverbindung erfolgreich hergestellt.');
    
    // 2. Prüfe BM25-Funktionalität
    console.log('\n🔬 Prüfe BM25-Funktionalität...');
    const bm25Available = await testBM25Functionality();
    
    if (bm25Available) {
      console.log('✅ BM25-Funktionalität ist verfügbar!');
      
      // 3. Konfiguriere einen Tokenizer
      console.log('\n🔧 Konfiguriere Tokenizer...');
      await configureBM25Tokenizer({
        language: config.rag.language,
        tokenizerName: 'test_tokenizer'
      });
      
      // 4. Teste die Tokenisierung
      console.log('\n📝 Teste Tokenisierung...');
      const tokenizerTestQuery = `
        SELECT tokenize('Dies ist ein Test für die BM25-Funktionalität in PostgreSQL mit VectorChord.', 'test_tokenizer') as tokenized_text;
      `;
      
      const tokenizerResult = await DbClient.query(tokenizerTestQuery);
      console.log('\nTokenisierungsergebnis:');
      console.log(tokenizerResult.rows[0].tokenized_text);
      
      // 5. Teste BM25-Vektorisierung
      console.log('\n🧮 Teste BM25-Vektorisierung...');
      const bm25TestQuery = `
        SELECT tokenize('Dies ist ein Test für die BM25-Funktionalität.', 'test_tokenizer')::bm25vector as bm25vector;
      `;
      
      const bm25Result = await DbClient.query(bm25TestQuery);
      console.log('\nBM25-Vektorisierungsergebnis:');
      console.log(bm25Result.rows[0].bm25vector);
      
      // 6. Erstelle Test-Tabelle (wenn sie nicht existiert)
      console.log('\n📋 Erstelle Testtabelle...');
      await DbClient.query(`
        CREATE TABLE IF NOT EXISTS bm25_test (
          id SERIAL PRIMARY KEY,
          text TEXT NOT NULL,
          embedding bm25vector
        );
      `);
      
      // 7. Füge Testdaten hinzu
      console.log('\n📥 Füge Testdaten hinzu...');
      await DbClient.query(`DELETE FROM bm25_test;`); // Lösche vorhandene Daten
      
      const testData = [
        'PostgreSQL ist ein leistungsstarkes, Open-Source-Datenbanksystem.',
        'VectorChord BM25 ist eine Erweiterung für PostgreSQL, die BM25-Ranking implementiert.',
        'BM25 ist ein Ranking-Algorithmus für Textsuchmaschinen.',
        'Mastra ist ein Framework für die Entwicklung von Agenten in TypeScript.',
        'RAG steht für Retrieval-Augmented Generation.',
        'PostgreSQL unterstützt verschiedene Indextypen, darunter GIN, GiST und nun auch BM25.'
      ];
      
      for (const text of testData) {
        await DbClient.query(`
          INSERT INTO bm25_test (text, embedding) 
          VALUES ($1, tokenize($1, 'test_tokenizer'))
        `, [text]);
      }
      
      // 8. Erstelle BM25-Index
      console.log('\n🔎 Erstelle BM25-Index...');
      await DbClient.query(`
        DROP INDEX IF EXISTS bm25_test_idx;
        CREATE INDEX bm25_test_idx ON bm25_test USING bm25 (embedding bm25_ops);
      `);
      
      // 9. Teste BM25-Suche
      console.log('\n🔍 Teste BM25-Suche...');
      const searchQuery = `
        SELECT id, text, embedding <&> to_bm25query('bm25_test_idx', tokenize('PostgreSQL Datenbank', 'test_tokenizer')) as score
        FROM bm25_test
        ORDER BY score
        LIMIT 3;
      `;
      
      const searchResult = await DbClient.query(searchQuery);
      console.log('\nSuchergebnisse:');
      searchResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. Score: ${row.score} - ${row.text}`);
      });
      
      console.log('\n✅ BM25-Funktionalitätstest erfolgreich abgeschlossen!');
    } else {
      console.error('❌ BM25-Funktionalität ist nicht verfügbar!');
      console.log('\n💡 Bitte führe das setup-postgres.sh Skript aus, um die BM25-Funktionalität zu installieren.');
    }
  } catch (error) {
    console.error('❌ Fehler beim BM25-Funktionalitätstest:', error);
  } finally {
    // Beende die Verbindung
    try {
      await DbClient.query('SELECT 1');
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  }
}

// Führe den Test aus
testBM25().catch(console.error);