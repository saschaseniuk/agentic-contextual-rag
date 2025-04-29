#!/usr/bin/env node
// src/scripts/setup-es.ts
import { ESClient } from '../db/elasticsearch/client';
import { setupDocumentsIndex, resetDocumentsIndex, DOCUMENTS_INDEX } from '../db/elasticsearch/indices';

/**
 * Erstellt oder setzt die Elasticsearch-Indizes zurück
 * @param reset Ob die Indizes zurückgesetzt werden sollen
 */
async function setupElasticsearch(reset: boolean = false) {
  try {
    console.log('🔍 Starte Elasticsearch-Setup...');
    
    // 1. Teste die Verbindung
    console.log('\n🔌 Teste Elasticsearch-Verbindung...');
    const connected = await ESClient.testConnection();
    if (!connected) {
      console.error('❌ Verbindung zu Elasticsearch konnte nicht hergestellt werden.');
      console.log('\n💡 Tipps zur Fehlerbehebung:');
      console.log('   - Ist Elasticsearch gestartet?');
      console.log('   - Überprüfe die Einstellungen in der .env-Datei');
      console.log('   - Starte Docker-Container: docker-compose up -d elasticsearch');
      process.exit(1);
    }
    console.log('✅ Verbindung zu Elasticsearch erfolgreich');

    // 2. Prüfe, ob der Index existiert
    const indexExists = await ESClient.indexExists(DOCUMENTS_INDEX);
    console.log(`\n🗂️ Index '${DOCUMENTS_INDEX}': ${indexExists ? 'existiert' : 'existiert nicht'}`);
    
    // 3. Erstelle oder setze den Index zurück
    if (reset && indexExists) {
      console.log(`\n🗑️ Index '${DOCUMENTS_INDEX}' wird zurückgesetzt...`);
      const resetSuccess = await resetDocumentsIndex();
      if (!resetSuccess) {
        console.error(`❌ Fehler beim Zurücksetzen des Index '${DOCUMENTS_INDEX}'`);
        process.exit(1);
      }
      console.log(`✅ Index '${DOCUMENTS_INDEX}' erfolgreich zurückgesetzt`);
    } else if (!indexExists) {
      console.log(`\n📝 Index '${DOCUMENTS_INDEX}' wird erstellt...`);
      const createSuccess = await setupDocumentsIndex();
      if (!createSuccess) {
        console.error(`❌ Fehler beim Erstellen des Index '${DOCUMENTS_INDEX}'`);
        process.exit(1);
      }
      console.log(`✅ Index '${DOCUMENTS_INDEX}' erfolgreich erstellt`);
    } else {
      console.log(`\n✅ Index '${DOCUMENTS_INDEX}' existiert bereits und wird nicht zurückgesetzt`);
      console.log('   Verwende --reset, um den Index zurückzusetzen');
    }
    
    console.log('\n🏁 Elasticsearch-Setup abgeschlossen.');
  } catch (error) {
    console.error('❌ Unerwarteter Fehler beim Elasticsearch-Setup:', error);
    process.exit(1);
  }
}

// Kommandozeilenargumente verarbeiten
const args = process.argv.slice(2);
const reset = args.includes('--reset');

// Führe das Skript aus
setupElasticsearch(reset)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unbehandelter Fehler:', error);
    process.exit(1);
  });