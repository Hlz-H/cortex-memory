import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { CREATE_TABLES } from './schema';
import { listBuiltinAgents } from '../agent/builtins';

let instance: Database.Database | null = null;

function getDefaultDbPath(): string {
  const dir = path.join(os.homedir(), '.cortex');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'memory.db');
}

export function getDatabase(dbPath?: string): Database.Database {
  if (instance) return instance;
  const resolvedPath = dbPath || getDefaultDbPath();
  instance = new Database(resolvedPath);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  return instance;
}

export function initDatabase(db?: Database.Database): void {
  const dbInstance = db || getDatabase();
  dbInstance.exec(CREATE_TABLES);

  // Sync built-in agents
  const agents = listBuiltinAgents();
  const stmt = dbInstance.prepare(
    'INSERT OR IGNORE INTO agents (id, name, description, capabilities, model, config, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const a of agents) {
    stmt.run(a.id, a.name, a.description, JSON.stringify(a.capabilities), a.model, '{}', a.status);
  }
}

export function closeDatabase(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
