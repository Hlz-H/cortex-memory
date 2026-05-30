import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';

export interface MemoryLink {
  id: string;
  source_id: string;
  target_id: string;
  link_type: string;
  weight: number;
  label: string | null;
  agent_id: string | null;
  created_at: string;
}

export interface LinkGraph {
  nodes: { id: string; content: string; tier: string }[];
  edges: MemoryLink[];
}

export function createLink(sourceId: string, targetId: string, linkType: string = 'related_to', weight: number = 1.0, label?: string, agentId?: string): MemoryLink {
  const db = getDatabase();
  const now = new Date().toISOString();
  const srcExists = db.prepare('SELECT id FROM memories WHERE id = ?').get(sourceId);
  const tgtExists = db.prepare('SELECT id FROM memories WHERE id = ?').get(targetId);
  if (!srcExists) throw new Error(`Source memory ${sourceId} not found`);
  if (!tgtExists) throw new Error(`Target memory ${targetId} not found`);

  const id = uuidv4();
  db.prepare('INSERT OR REPLACE INTO memory_links (id, source_id, target_id, link_type, weight, label, agent_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, sourceId, targetId, linkType, weight, label || null, agentId || null, now);
  db.prepare('INSERT OR REPLACE INTO memory_links (id, source_id, target_id, link_type, weight, label, agent_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(uuidv4(), targetId, sourceId, `reverse_${linkType}`, weight, label || null, agentId || null, now);
  return { id, source_id: sourceId, target_id: targetId, link_type: linkType, weight, label: label || null, agent_id: agentId || null, created_at: now };
}

export function deleteLink(id: string): boolean {
  const db = getDatabase();
  const link = db.prepare('SELECT * FROM memory_links WHERE id = ?').get(id) as MemoryLink | undefined;
  if (!link) return false;
  db.transaction(() => {
    db.prepare('DELETE FROM memory_links WHERE id = ?').run(id);
    db.prepare('DELETE FROM memory_links WHERE source_id = ? AND target_id = ? AND link_type = ?').run(link.target_id, link.source_id, `reverse_${link.link_type}`);
  })();
  return true;
}

export function getMemoryLinks(memoryId: string, depth: number = 0): LinkGraph {
  const db = getDatabase();
  if (depth <= 0) {
    const edges = db.prepare("SELECT * FROM memory_links WHERE source_id = ? AND link_type NOT LIKE 'reverse_%' ORDER BY weight DESC").all(memoryId) as MemoryLink[];
    const nodeIds = new Set<string>([memoryId]);
    edges.forEach(e => nodeIds.add(e.target_id));
    const nodes: LinkGraph['nodes'] = [];
    for (const nid of nodeIds) {
      const mem = db.prepare('SELECT id, content, tier FROM memories WHERE id = ?').get(nid) as { id: string; content: string; tier: string } | undefined;
      if (mem) nodes.push(mem);
    }
    return { nodes, edges };
  }
  const edges = db.prepare(`
    WITH RECURSIVE lt(id,source_id,target_id,link_type,weight,label,agent_id,created_at,lvl) AS (
      SELECT ml.*,0 FROM memory_links ml WHERE ml.source_id=? AND ml.link_type NOT LIKE 'reverse_%'
      UNION ALL
      SELECT ml.*, lt.lvl+1 FROM memory_links ml JOIN lt ON ml.source_id=lt.target_id WHERE ml.link_type NOT LIKE 'reverse_%' AND lt.lvl<?
    ) SELECT DISTINCT id,source_id,target_id,link_type,weight,label,agent_id,created_at FROM lt ORDER BY weight DESC
  `).all(memoryId, depth) as MemoryLink[];
  const nodeIds = new Set<string>([memoryId]);
  edges.forEach(e => { nodeIds.add(e.source_id); nodeIds.add(e.target_id); });
  const nodes: LinkGraph['nodes'] = [];
  for (const nid of nodeIds) {
    const mem = db.prepare('SELECT id, content, tier FROM memories WHERE id = ?').get(nid) as { id: string; content: string; tier: string } | undefined;
    if (mem) nodes.push(mem);
  }
  return { nodes, edges };
}

export function getLinkStats(): { link_type: string; count: number }[] {
  const db = getDatabase();
  return db.prepare("SELECT link_type, COUNT(*) as count FROM memory_links WHERE link_type NOT LIKE 'reverse_%' GROUP BY link_type ORDER BY count DESC").all() as { link_type: string; count: number }[];
}
