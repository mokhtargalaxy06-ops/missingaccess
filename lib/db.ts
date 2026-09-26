import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import starters from './quran-starters.json';

export const dataDir = path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const globalDb = globalThis as unknown as { charityDb?: DatabaseSync; quranSchemaReady?: boolean };
export function db() {
  if (globalDb.charityDb && globalDb.quranSchemaReady) return globalDb.charityDb;
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(path.join(dataDir, 'audio'), { recursive: true });
  const database = globalDb.charityDb || new DatabaseSync(path.join(dataDir, 'charity.sqlite'));
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'volunteer', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
      language TEXT NOT NULL, category TEXT NOT NULL, source_text TEXT NOT NULL,
      source_url TEXT NOT NULL DEFAULT '', source_label TEXT NOT NULL, source_kind TEXT NOT NULL,
      owner_id TEXT REFERENCES users(id), status TEXT NOT NULL DEFAULT 'open',
      sample INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      source_arabic TEXT NOT NULL DEFAULT '', source_footnotes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id),
      user_id TEXT NOT NULL REFERENCES users(id), filename TEXT NOT NULL, mime TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
      review_note TEXT NOT NULL DEFAULT '', reviewer_id TEXT REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_recording ON contributions(request_id) WHERE status IN ('pending', 'approved');
    CREATE TABLE IF NOT EXISTS supporters (
      request_id TEXT NOT NULL REFERENCES requests(id), user_id TEXT NOT NULL REFERENCES users(id),
      PRIMARY KEY(request_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, resets INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS contribution_user ON contributions(user_id);
  `);
  const columns = database.prepare('PRAGMA table_info(requests)').all() as { name: string }[];
  for (const column of ['source_arabic', 'source_footnotes']) {
    if (!columns.some(c => c.name === column)) database.exec(`ALTER TABLE requests ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
  }
  if (!database.prepare("SELECT 1 FROM metadata WHERE key='quran-starters-v1'").get()) {
    database.exec('BEGIN IMMEDIATE');
    try {
      const insert = database.prepare(`INSERT OR IGNORE INTO requests (id,title,description,language,category,source_text,source_url,source_label,source_kind,sample,source_arabic,source_footnotes) VALUES (?,?,?,?,'Quran translation',?,?,?,'quran',1,?,?)`);
      for (const source of starters) {
        insert.run(source.id, source.title, `Help make the meaning of Quran ${source.sura}:${source.aya} accessible through a clear ${source.language} reading of the translation. This is a starter request for volunteers.`, source.language, source.text, source.url, source.label, source.arabic, source.footnotes);
      }
      database.prepare("INSERT INTO metadata VALUES ('quran-starters-v1','1')").run();
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
  }
  globalDb.charityDb = database;
  globalDb.quranSchemaReady = true;
  return database;
}
