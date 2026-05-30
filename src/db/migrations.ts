import Database from 'better-sqlite3';
import * as fs from 'fs';
import { getConfig } from '../config';

export interface Migration {
  version: number;
  name: string;
  up: string;
  down?: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  tier TEXT NOT NULL CHECK(tier IN ('permanent','longterm','shortterm','instant')),
  category TEXT,
  agent_id TEXT,
  source TEXT,
  importance REAL DEFAULT 1.0,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  accessed_at TEXT DEFAULT (datetime('now')),
  access_count INTEGER DEFAULT 1
);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  content, metadata, content=memories, content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS memories_fts_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, content, metadata) VALUES (new.rowid, new.content, new.metadata);
END;

CREATE TRIGGER IF NOT EXISTS memories_fts_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, metadata) VALUES('delete', old.rowid, old.content, old.metadata);
END;

CREATE TRIGGER IF NOT EXISTS memories_fts_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, metadata) VALUES('delete', old.rowid, old.content, old.metadata);
  INSERT INTO memories_fts(rowid, content, metadata) VALUES (new.rowid, new.content, new.metadata);
END;

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  parent_id TEXT REFERENCES tags(id),
  description TEXT
);

CREATE TABLE IF NOT EXISTS memory_tags (
  memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (memory_id, tag_id)
);

CREATE TABLE IF NOT EXISTS memory_links (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'related_to',
  weight REAL DEFAULT 1.0,
  label TEXT,
  agent_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(source_id, target_id, link_type)
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capabilities TEXT DEFAULT '[]',
  model TEXT DEFAULT 'llama3.2',
  config TEXT DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT DEFAULT 'running',
  input TEXT,
  output TEXT,
  tool_calls TEXT DEFAULT '[]',
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memory_tags_memory ON memory_tags(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_tags_tag ON memory_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_source ON memory_links(source_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_target ON memory_links(target_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
    `,
  },
];

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const config = getConfig();
  const dir = config.dbPath.substring(0, config.dbPath.lastIndexOf('/')) || config.dbPath.substring(0, config.dbPath.lastIndexOf('\\'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  dbInstance = new Database(config.dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function getCurrentVersion(db?: Database.Database): number {
  const database = db || getDb();
  try {
    const row = database.prepare("SELECT MAX(version) as version FROM schema_version").get() as { version: number } | undefined;
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

export function migrate(db?: Database.Database): void {
  const database = db || getDb();

  // Create version table if not exists
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY DEFAULT 0
    );
  `);

  // Ensure exactly one row exists
  const row = database.prepare("SELECT version FROM schema_version LIMIT 1").get() as { version: number } | undefined;
  if (!row) {
    database.prepare("INSERT INTO schema_version (version) VALUES (0)").run();
  }

  const currentVersion = getCurrentVersion(database);
  const targetVersion = MIGRATIONS.length;

  if (currentVersion >= targetVersion) return;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      database.exec(migration.up);
      database.prepare('UPDATE schema_version SET version = ? WHERE version = ?').run(migration.version, currentVersion);
    }
  }
}

export function resetDb(): void {
  closeDb();
  const config = getConfig();
  if (fs.existsSync(config.dbPath)) {
    fs.unlinkSync(config.dbPath);
  }
}

export { migrate as migrateUp, closeDb as closeDatabase };
