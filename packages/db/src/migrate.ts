import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export class MigrationRunner {
  private db: sqlite3.Database;
  private migrationsDir: string;

  constructor(db: sqlite3.Database) {
    this.db = db;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  async runMigrations(): Promise<void> {
    console.log('🔄 Running database migrations...');

    // Create migrations tracking table if it doesn't exist
    await this.createMigrationsTable();

    // Get list of migration files
    const migrationFiles = this.getMigrationFiles();

    // Get already applied migrations
    const appliedMigrations = await this.getAppliedMigrations();

    // Filter out already applied migrations
    const pendingMigrations = migrationFiles.filter(
      m => !appliedMigrations.includes(m.id)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

    // Execute each pending migration
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    console.log('✅ All migrations completed successfully');
  }

  private createMigrationsTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at INTEGER NOT NULL
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private getMigrationFiles(): Migration[] {
    if (!fs.existsSync(this.migrationsDir)) {
      console.warn(`⚠️  Migrations directory not found: ${this.migrationsDir}`);
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files.map(file => {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) return null;

      const id = parseInt(match[1], 10);
      const name = match[2];
      const sql = fs.readFileSync(path.join(this.migrationsDir, file), 'utf8');

      return { id, name, sql };
    }).filter(Boolean) as Migration[];
  }

  private getAppliedMigrations(): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT id FROM _migrations ORDER BY id', (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.id));
      });
    });
  }

  private executeMigration(migration: Migration): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`⏳ Applying migration ${migration.id}: ${migration.name}...`);

      this.db.exec(migration.sql, (err) => {
        if (err) {
          console.error(`❌ Migration ${migration.id} failed:`, err);
          reject(err);
          return;
        }

        // Record migration as applied
        this.db.run(
          'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)',
          [migration.id, migration.name, Date.now()],
          (err) => {
            if (err) {
              console.error(`❌ Failed to record migration ${migration.id}:`, err);
              reject(err);
            } else {
              console.log(`✅ Migration ${migration.id} completed: ${migration.name}`);
              resolve();
            }
          }
        );
      });
    });
  }
}
