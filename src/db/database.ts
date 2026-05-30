import { getDb, migrate } from './migrations';
import { listBuiltinAgents } from '../agent/builtins';

export function initDatabase(): void {
  const db = getDb();
  migrate(db);

  // Sync built-in agents
  const agents = listBuiltinAgents();
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO agents (id, name, description, capabilities, model, config, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const a of agents) {
    stmt.run(a.id, a.name, a.description, JSON.stringify(a.capabilities), a.model, '{}', a.status);
  }
}

export { getDb, closeDb, migrate as migrateUp, closeDb as closeDatabase } from './migrations';
