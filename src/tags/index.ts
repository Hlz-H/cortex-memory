import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { ConflictError } from '../utils/error';

export interface Tag {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
}

export interface TagTreeNode extends Tag {
  children: TagTreeNode[];
}

export function createTag(name: string, parentId?: string, description?: string): Tag {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: string } | undefined;
  if (existing) {
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(existing.id) as Tag;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO tags (id, name, parent_id, description) VALUES (?, ?, ?, ?)').run(
    id, name, parentId || null, description || null
  );
  return { id, name, parent_id: parentId || null, description: description || null };
}

export function deleteTag(id: string): boolean {
  const db = getDb();
  const children = db.prepare('SELECT COUNT(*) as cnt FROM tags WHERE parent_id = ?').get(id) as { cnt: number };
  if (children.cnt > 0) {
    throw new ConflictError('Cannot delete tag with child tags');
  }
  const usage = db.prepare('SELECT COUNT(*) as cnt FROM memory_tags WHERE tag_id = ?').get(id) as { cnt: number };
  if (usage.cnt > 0) {
    throw new ConflictError(`Cannot delete tag: used by ${usage.cnt} memories`);
  }
  const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getTag(id: string): Tag | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag | undefined;
}

export function getTagByName(name: string): Tag | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as Tag | undefined;
}

export function listTags(): Tag[] {
  const db = getDb();
  return db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as Tag[];
}

export function getTagHierarchy(): TagTreeNode[] {
  const db = getDb();
  const all = db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as Tag[];
  const map = new Map<string, TagTreeNode>();
  const roots: TagTreeNode[] = [];

  for (const t of all) {
    map.set(t.id, { ...t, children: [] });
  }
  for (const t of all) {
    const node = map.get(t.id)!;
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function assignTag(memoryId: string, tagId: string): void {
  assignTagsToMemory(memoryId, [tagId]);
}

export function assignTagsToMemory(memoryId: string, tagIds: string[]): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM memory_tags WHERE memory_id = ?').run(memoryId);
    const stmt = db.prepare('INSERT OR IGNORE INTO memory_tags (memory_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      stmt.run(memoryId, tagId);
    }
  });
  tx();
}

export function getMemoryTags(memoryId: string): Tag[] {
  const db = getDb();
  return db.prepare(
    `SELECT t.* FROM tags t JOIN memory_tags mt ON t.id = mt.tag_id WHERE mt.memory_id = ? ORDER BY t.name`
  ).all(memoryId) as Tag[];
}

export function removeTagFromMemory(memoryId: string, tagId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM memory_tags WHERE memory_id = ? AND tag_id = ?').run(memoryId, tagId);
}
