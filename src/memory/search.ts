import { getDatabase } from '../db/database';
import { getMemoryTags } from '../tags/index';

export interface SearchOptions {
  tier?: string;
  tag?: string;
  limit?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  tier: string;
  category: string | null;
  importance: number;
  created_at: string;
  accessed_at: string;
  access_count: number;
  tags: { id: string; name: string }[];
}

export function searchMemories(query: string, options: SearchOptions = {}): SearchResult[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (options.tier) { conditions.push('m.tier = ?'); values.push(options.tier); }
  if (options.tag) {
    conditions.push('m.id IN (SELECT memory_id FROM memory_tags WHERE tag_id IN (SELECT id FROM tags WHERE name = ?))');
    values.push(options.tag);
  }

  const extraWhere = conditions.length > 0 ? 'AND (' + conditions.join(' AND ') + ')' : '';
  const limit = options.limit || 50;

  const rows = db.prepare(
    'SELECT m.id, m.content, m.tier, m.category, m.importance, m.created_at, m.accessed_at, m.access_count ' +
    'FROM memories m ' +
    'WHERE m.rowid IN (SELECT rowid FROM memories_fts WHERE memories_fts MATCH ?) ' +
    extraWhere + ' ' +
    'ORDER BY m.created_at DESC LIMIT ?'
  ).all(query, ...values, limit) as SearchResult[];

  for (const row of rows) {
    row.tags = getMemoryTags(row.id).map(t => ({ id: t.id, name: t.name }));
  }
  return rows;
}
