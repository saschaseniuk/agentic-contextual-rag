#!/usr/bin/env node
// src/scripts/check-db.ts
import { DbClient } from '../db/client';
import { config } from '../lib/config';
import { exit } from 'process';

/**
 * Überprüft die Datenbankverbindung und -struktur
 */
async function checkDatabase() {
  console.log('🔍 Starte Datenbank-Diagnose...');
  console.log('\n📊 Datenbank-Konfiguration:');
  console.log(`   Host: ${config.database.host}`);
  console.log(`   Port: ${config.database.port}`);
  console.log(`   Name: ${config.database.name}`);
  console.log(`   User: ${config.database.user}`);

  try {
    // 1. Teste die Datenbankverbindung
    console.log('\n🔌 Teste Datenbankverbindung...');
    try {
      const connectionResult = await DbClient.query('SELECT NOW() as time');
      console.log(`   ✅ Verbindung erfolgreich (Server-Zeit: ${connectionResult.rows[0].time})`);
    } catch (error) {
      console.error(`   ❌ Verbindungsfehler: ${error}`);
      console.log('\n💡 Tipps zur Fehlerbehebung:');
      console.log('   - Ist der PostgreSQL-Server gestartet?');
      console.log('   - Stimmen die Zugangsdaten in der .env-Datei?');
      console.log('   - Versuche: docker-compose up -d im docker-Verzeichnis');
      exit(1);
    }

    // 2. Prüfe, ob die Datenbank existiert
    console.log('\n🗃️ Prüfe Datenbank...');
    try {
      const dbResult = await DbClient.query(
        "SELECT datname FROM pg_database WHERE datname = $1",
        [config.database.name]
      );
      
      if (dbResult.rowCount > 0) {
        console.log(`   ✅ Datenbank '${config.database.name}' existiert`);
      } else {
        console.log(`   ❌ Datenbank '${config.database.name}' existiert nicht!`);
        exit(1);
      }
    } catch (error) {
      console.error(`   ❌ Fehler bei der Datenbankprüfung: ${error}`);
      exit(1);
    }

    // 3. Prüfe, ob die extensions installiert sind
    console.log('\n🧩 Prüfe Erweiterungen...');
    try {
      const extensionsResult = await DbClient.query(
        "SELECT extname FROM pg_extension"
      );
      
      const extensions = extensionsResult.rows.map(row => row.extname);
      console.log(`   Gefundene Erweiterungen: ${extensions.join(', ')}`);
      
      const requiredExtensions = ['vector', 'pg_tokenizer', 'vchord_bm25'];
      const missingExtensions = requiredExtensions.filter(ext => !extensions.includes(ext));
      
      if (missingExtensions.length === 0) {
        console.log('   ✅ Alle erforderlichen Erweiterungen sind installiert');
      } else {
        console.log(`   ❌ Fehlende Erweiterungen: ${missingExtensions.join(', ')}`);
      }
    } catch (error) {
      console.error(`   ❌ Fehler bei der Erweiterungsprüfung: ${error}`);
    }

    // 4. Prüfe, ob die documents-Tabelle existiert
    console.log('\n📋 Prüfe Tabellen...');
    try {
      const tablesResult = await DbClient.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
      );
      
      const tables = tablesResult.rows.map(row => row.tablename);
      console.log(`   Gefundene Tabellen: ${tables.join(', ')}`);
      
      if (tables.includes('documents')) {
        console.log('   ✅ Tabelle "documents" existiert');

        // 5. Prüfe die Struktur der documents-Tabelle
        const columnsResult = await DbClient.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'documents'
        `);

        console.log('\n📐 Struktur der "documents"-Tabelle:');
        console.log('   -----------------------------');
        columnsResult.rows.forEach(row => {
          console.log(`   ${row.column_name}: ${row.data_type}`);
        });
        console.log('   -----------------------------');

        // 6. Prüfe die Indizes
        const indexesResult = await DbClient.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = 'documents'
        `);

        console.log('\n📇 Indizes auf der "documents"-Tabelle:');
        console.log('   -----------------------------');
        if (indexesResult.rowCount === 0) {
          console.log('   ❌ Keine Indizes gefunden!');
        } else {
          indexesResult.rows.forEach(row => {
            console.log(`   ${row.indexname}`);
            console.log(`   ${row.indexdef}`);
            console.log('   -----------------------------');
          });
        }

        // 7. Teste, ob wir in die Tabelle schreiben können
        try {
          await DbClient.query(`
            INSERT INTO documents (source, content, context_summary, metadata)
            VALUES ('test', 'Test-Inhalt', 'Test-Zusammenfassung', '{"test": true}')
          `);
          console.log('\n✏️ Schreibtest: ✅ Erfolgreich');

          // Lösche den Testeintrag wieder
          await DbClient.query(`
            DELETE FROM documents WHERE source = 'test' AND content = 'Test-Inhalt'
          `);
        } catch (error) {
          console.error(`\n✏️ Schreibtest: ❌ Fehlgeschlagen: ${error}`);
        }
      } else {
        console.log('   ❌ Tabelle "documents" existiert nicht!');
        console.log('\n💡 Lösung:');
        console.log('   Führe das setup_db.sql-Skript aus:');
        console.log('   psql -h localhost -U postgres -d rag_db -f docker/setup_db.sql');
      }
    } catch (error) {
      console.error(`   ❌ Fehler bei der Tabellenprüfung: ${error}`);
    }

  } catch (error) {
    console.error('❌ Allgemeiner Fehler bei der Datenbankdiagnose:', error);
  } finally {
    console.log('\n🏁 Diagnose abgeschlossen.');
  }
}

// Führe das Skript aus
checkDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unbehandelter Fehler:', error);
    process.exit(1);
  });