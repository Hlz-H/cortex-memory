import { Hono } from 'hono';
import { createMemory, listMemories, getMemory, updateMemory, deleteMemory, promoteMemory, demoteMemory, getStats } from '../memory/store';
import { searchMemories } from '../memory/search';
import { createTag, deleteTag, listTags, getTagHierarchy, getTagByName, assignTagsToMemory, getMemoryTags } from '../tags/index';
import { createLink, deleteLink, getMemoryLinks, getLinkStats } from '../links/index';

const api = new Hono();

// Memories
api.get('/memories', async (c) => {
  const tier = c.req.query('tier') || undefined;
  const tag = c.req.query('tag') || undefined;
  const category = c.req.query('category') || undefined;
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const memories = listMemories({ tier, tag, category, limit, offset });
  return c.json({ data: memories, count: memories.length });
});

api.post('/memories', async (c) => {
  const body = await c.req.json();
  const { content, tier, category, agent_id, tags, importance, source } = body;
  if (!content) return c.json({ error: 'content is required' }, 400);

  const mem = createMemory(content, tier || 'shortterm', category, agent_id, tags, importance || 1.0, source);
  return c.json({ data: mem }, 201);
});

api.get('/memories/:id', async (c) => {
  const id = c.req.param('id');
  const mem = getMemory(id);
  if (!mem) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: mem });
});

api.patch('/memories/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const mem = updateMemory(id, body);
  if (!mem) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: mem });
});

api.delete('/memories/:id', async (c) => {
  const id = c.req.param('id');
  if (deleteMemory(id)) return c.json({ success: true });
  return c.json({ error: 'Not found' }, 404);
});

api.post('/memories/:id/promote', async (c) => {
  const id = c.req.param('id');
  const mem = promoteMemory(id);
  if (!mem) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: mem });
});

api.post('/memories/:id/demote', async (c) => {
  const id = c.req.param('id');
  const mem = demoteMemory(id);
  if (!mem) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: mem });
});

// Memory tags
api.get('/memories/:id/tags', async (c) => {
  const id = c.req.param('id');
  const tags = getMemoryTags(id);
  return c.json({ data: tags });
});

api.put('/memories/:id/tags', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { tagIds } = body;
  if (!Array.isArray(tagIds)) return c.json({ error: 'tagIds array required' }, 400);
  assignTagsToMemory(id, tagIds);
  return c.json({ success: true });
});

// Memory links
api.get('/memories/:id/links', async (c) => {
  const id = c.req.param('id');
  const depth = parseInt(c.req.query('depth') || '0');
  const graph = getMemoryLinks(id, depth);
  return c.json({ data: graph });
});

api.post('/memories/:id/links', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { targetId, linkType, weight, label } = body;
  if (!targetId) return c.json({ error: 'targetId required' }, 400);

  const link = createLink(id, targetId, linkType, weight, label);
  return c.json({ data: link }, 201);
});

// Tags
api.get('/tags', async (c) => {
  const tags = listTags();
  return c.json({ data: tags });
});

api.post('/tags', async (c) => {
  const body = await c.req.json();
  const { name, parentId, description } = body;
  if (!name) return c.json({ error: 'name is required' }, 400);

  const tag = createTag(name, parentId, description);
  return c.json({ data: tag }, 201);
});

api.delete('/tags/:id', async (c) => {
  const id = c.req.param('id');
  try {
    if (deleteTag(id)) return c.json({ success: true });
    return c.json({ error: 'Not found' }, 404);
  } catch (e: unknown) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

api.get('/tags/hierarchy', async (c) => {
  const tree = getTagHierarchy();
  return c.json({ data: tree });
});

// Links
api.get('/links', async (c) => {
  const stats = getLinkStats();
  return c.json({ data: stats });
});

api.delete('/links/:id', async (c) => {
  const id = c.req.param('id');
  if (deleteLink(id)) return c.json({ success: true });
  return c.json({ error: 'Not found' }, 404);
});

// Search
api.get('/search', async (c) => {
  const q = c.req.query('q') || '';
  const tier = c.req.query('tier') || undefined;
  const tag = c.req.query('tag') || undefined;
  const limit = parseInt(c.req.query('limit') || '50');

  if (!q) return c.json({ data: [], count: 0 });

  const results = searchMemories(q, { tier, tag, limit });
  return c.json({ data: results, count: results.length });
});

// Stats
api.get('/stats', async (c) => {
  const stats = getStats();
  const linkStats = getLinkStats();
  return c.json({ data: { ...stats, linkStats } });
});

// Agents
api.get('/agents', async (c) => {
  const { listBuiltinAgents } = await import('../agent/builtins');
  return c.json({ data: listBuiltinAgents() });
});

api.get('/agents/:id', async (c) => {
  const { getBuiltinAgent } = await import('../agent/builtins');
  const id = c.req.param('id');
  const agent = getBuiltinAgent(id);
  if (!agent) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: agent });
});

api.post('/agents/:id/run', async (c) => {
  const { getBuiltinAgent } = await import('../agent/builtins');
  const { runAgent } = await import('../agent/runner');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const agent = getBuiltinAgent(id);
  if (!agent) return c.json({ error: 'Not found' }, 404);

  const result = await runAgent(agent, body.input);
  return c.json({ data: result });
});

api.get('/agents/runs', async (c) => {
  const db = (await import('../db/database')).getDatabase();
  const agentId = c.req.query('agentId') || undefined;
  const limit = parseInt(c.req.query('limit') || '50');

  let sql = 'SELECT * FROM agent_runs';
  const params: unknown[] = [];
  if (agentId) {
    sql += ' WHERE agent_id = ?';
    params.push(agentId);
  }
  sql += ' ORDER BY started_at DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  return c.json({ data: rows });
});

export { api as apiRoutes };
