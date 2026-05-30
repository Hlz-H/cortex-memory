import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { createTag, assignTagsToMemory, getMemoryTags } from '../tags/index';

export interface Memory {
  id: string;
  content: string;
  tier: string;
  category: string | null;
  agent_id: string | null;
  source: string | null;
  importance: number;
  metadata: string;
  created_at: string;
  updated_at: string;
  accessed_at: string;
  access_count: number;
  tags?: { id: string; name: string }[];
}

export interface MemoryListOptions {
  tier?: string;
  tag?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

const VALID_TIERS = ['permanent', 'longterm', 'shortterm', 'instant'];
const TIER_ORDER = ['instant', 'shortterm', 'longterm', 'permanent'];

function validTier(tier: string): string {
  return VALID_TIERS.includes(tier) ? tier : 'shortterm';
}

export function createMemory(
  content: string,
  tier: string = 'shortterm',
  category?: string,
  agentId?: string,
  tags?: string[],
  importance: number = 1.0,
  source?: string
): Memory {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO memories (id, content, tier, category, agent_id, source, importance, metadata, created_at, updated_at, accessed_at, access_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, 1)`
  ).run(id, content, validTier(tier), category || null, agentId || null, source || null, importance, now, now, now);

  if (tags && tags.length > 0) {
    const tagIds: string[] = [];
    for (const tagName of tags) {
      const existing = getDatabase().prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: string } | undefined;
      if (existing) {
        tagIds.push(existing.id);
      } else {
        const tag = createTag(tagName);
        tagIds.push(tag.id);
      }
    }
    assignTagsToMemory(id, tagIds);
  }

  return getMemory(id) as Memory;
}

export function getMemory(id: string): Memory | undefined {
  const db = getDatabase();
  const mem = db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as Memory | undefined;
  if (!mem) return undefined;

  db.prepare(
    `UPDATE memories SET accessed_at = datetime('now'), access_count = access_count + 1 WHERE id = ?`
  ).run(id);

  mem.tags = getMemoryTags(id).map(t => ({ id: t.id, name: t.name }));
  return mem;
}

export function updateMemory(id: string, fields: Partial<{
  content: string; tier: string; category: string; importance: number; metadata: string; source: string;
}>): Memory | undefined {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM memories WHERE id = ?').get(id);
  if (!existing) return undefined;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (fields.content !== undefined) { updates.push('content = ?'); values.push(fields.content); }
  if (fields.tier !== undefined) { updates.push('tier = ?'); values.push(validTier(fields.tier)); }
  if (fields.category !== undefined) { updates.push('category = ?'); values.push(fields.category); }
  if (fields.importance !== undefined) { updates.push('importance = ?'); values.push(fields.importance); }
  if (fields.metadata !== undefined) { updates.push('metadata = ?'); values.push(fields.metadata); }
  if (fields.source !== undefined) { updates.push('source = ?'); values.push(fields.source); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE memories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  return getMemory(id);
}

export function deleteMemory(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM memories WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listMemories(options: MemoryListOptions = {}): Memory[] {
  const db = getDatabase();
  const conditions: string[] = ['1=1'];
  const values: unknown[] = [];

  if (options.tier) { conditions.push('m.tier = ?'); values.push(options.tier); }
  if (options.category) { conditions.push('m.category = ?'); values.push(options.category); }
  if (options.tag) {
    conditions.push('m.id IN (SELECT memory_id FROM memory_tags mt2 JOIN tags t2 ON mt2.tag_id = t2.id WHERE t2.name = ?)');
    values.push(options.tag);
  }

  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const rows = db.prepare(
    `SELECT DISTINCT m.* FROM memories m WHERE ${conditions.join(' AND ')} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
  ).all(...values, limit, offset) as Memory[];

  for (const mem of rows) {
    mem.tags = getMemoryTags(mem.id).map(t => ({ id: t.id, name: t.name }));
  }
  return rows;
}

export function promoteMemory(id: string): Memory | undefined {
  const mem = getMemory(id);
  if (!mem) return undefined;
  const idx = TIER_ORDER.indexOf(mem.tier);
  if (idx >= 0 && idx < TIER_ORDER.length - 1) {
    return updateMemory(id, { tier: TIER_ORDER[idx + 1] });
  }
  return mem;
}

export function demoteMemory(id: string): Memory | undefined {
  const mem = getMemory(id);
  if (!mem) return undefined;
  const idx = TIER_ORDER.indexOf(mem.tier);
  if (idx > 0) {
    return updateMemory(id, { tier: TIER_ORDER[idx - 1] });
  }
  return mem;
}

export function getStats(): {
  total: number; by_tier: Record<string, number>; total_tags: number; total_links: number;
} {
  const db = getDatabase();
  const total = (db.prepare('SELECT COUNT(*) as cnt FROM memories').get() as { cnt: number }).cnt;
  const byTierRows = db.prepare('SELECT tier, COUNT(*) as cnt FROM memories GROUP BY tier').all() as { tier: string; cnt: number }[];
  const by_tier: Record<string, number> = {};
  for (const r of byTierRows) by_tier[r.tier] = r.cnt;

  const total_tags = (db.prepare('SELECT COUNT(*) as cnt FROM tags').get() as { cnt: number }).cnt;
  const total_links = (db.prepare("SELECT COUNT(*) as cnt FROM memory_links WHERE link_type NOT LIKE 'reverse_%'").get() as { cnt: number }).cnt;

  return { total, by_tier, total_tags, total_links };
}
