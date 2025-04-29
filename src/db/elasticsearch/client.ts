// src/db/elasticsearch/client.ts
import { Client } from '@elastic/elasticsearch';
import { config } from '../../lib/config';

// Erstelle den Elasticsearch-Client mit Konfiguration aus env
// und expliziter Versionsangabe, um Versionskonflikte zu vermeiden
export const elasticsearchClient = new Client({
  node: config.elasticsearch.node, // z.B. 'http://localhost:9200'
  auth: config.elasticsearch.auth ? {
    username: config.elasticsearch.auth.username,
    password: config.elasticsearch.auth.password
  } : undefined,
  // Timeout konfigurieren
  requestTimeout: 60000, // 60 Sekunden
  // Version explizit angeben, um Konflikte zu vermeiden
  compatibilityMode: true // Aktiviert Kompatibilitätsmodus mit Version 8
});

// Wrapper-Klasse für einfachere Handhabung
export class ESClient {
  /**
   * Prüft, ob die Verbindung zu Elasticsearch hergestellt werden kann
   */
  static async testConnection(): Promise<boolean> {
    try {
      const info = await elasticsearchClient.info();
      console.log(`Erfolgreich mit Elasticsearch verbunden: ${info.version?.number}`);
      return true;
    } catch (error) {
      console.error('Fehler bei der Verbindung zu Elasticsearch:', error);
      return false;
    }
  }

  /**
   * Prüft, ob ein Index existiert
   */
  static async indexExists(indexName: string): Promise<boolean> {
    try {
      return await elasticsearchClient.indices.exists({
        index: indexName
      });
    } catch (error) {
      console.error(`Fehler beim Prüfen des Index ${indexName}:`, error);
      return false;
    }
  }

  /**
   * Löscht einen Index, falls vorhanden
   */
  static async deleteIndex(indexName: string): Promise<boolean> {
    try {
      if (await this.indexExists(indexName)) {
        await elasticsearchClient.indices.delete({
          index: indexName
        });
        console.log(`Index ${indexName} erfolgreich gelöscht`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Fehler beim Löschen des Index ${indexName}:`, error);
      return false;
    }
  }
}