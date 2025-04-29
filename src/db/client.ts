// src/db/client.ts
import pg from 'pg';
import { config } from '../lib/config';

// PostgreSQL Client Konfiguration
const pool = new pg.Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
});

// Prüft die Verbindung beim Start und loggt Fehler
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Wrapper-Klasse für einfachere Handhabung
export class DbClient {
  /**
   * Führt eine Datenbankabfrage aus
   */
  static async query<T>(text: string, params: any[] = []): Promise<pg.QueryResult<T>> {
    const client = await pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  /**
   * Führt eine Transaktion aus
   */
  static async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Prüft, ob die Datenbankverbindung funktioniert
   */
  static async testConnection(): Promise<boolean> {
    try {
      await pool.query('SELECT NOW()');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}