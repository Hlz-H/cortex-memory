import { Hono } from 'hono';
import { createMemory, listMemories, getMemory, updateMemory, deleteMemory, promoteMemory, demoteMemory, getStats } from '../memory/store';
import { searchMemories } from '../memory/search';
import { createTag, deleteTag, listTags, getTagHierarchy, getTagByName, assignTagsToMemory, getMemoryTags } from '../tags/index';
import { createLink, deleteLink, getMemoryLinks, getLinkStats } from '../links/index';
import { getBuiltinAgent, listBuiltinAgents, runAgent } from '../agent/index';
import { getDb } from '../db/database';
import { ValidationError, NotFoundError } from '../utils/error';
import { validateId, validateTier, validateStringArray, validateLinkType, validateNumber } from '../utils/validation';

const api = new Hono();

// Error handler
api.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ error: err.message, code: err.code }, 400);
  }
  if (err instanceof NotFoundError) {
    return c.json({ error: err.message, code: err.code }, 404);
  }
  console.error('API Error:', err);
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
});

// Health
api.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Memories
api.get('/memories', (c) => {
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
  if (!body.content) throw new ValidationError('content is required');

  const mem = createMemory(
    body.content,
    body.tier || 'shortterm',
    body.category,
    body.agent_id,
    body.tags,
    body.importance || 1.0,
    body.source,
  );
  return c.json({ data: mem }, 201);
});

api.get('/memories/:id', (c) => {
  const id = c.req.param('id');
  const mem = getMemory(id);
  if (!mem) throw new NotFoundError('Memory', id);
  return c.json({ data: mem });
});

api.patch('/memories/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const mem = updateMemory(id, body);
  if (!mem) throw new NotFoundError('Memory', id);
  return c.json({ data: mem });
});

api.delete('/memories/:id', (c) => {
  const id = c.req.param('id');
  if (deleteMemory(id)) return c.json({ success: true });
  throw new NotFoundError('Memory', id);
});

api.post('/memories/:id/promote', (c) => {
  const id = c.req.param('id');
  const mem = promoteMemory(id);
  if (!mem) throw new NotFoundError('Memory', id);
  return c.json({ data: mem });
});

api.post('/memories/:id/demote', (c) => {
  const id = c.req.param('id');
  const mem = demoteMemory(id);
  if (!mem) throw new NotFoundError('Memory', id);
  return c.json({ data: mem });
});

// Memory tags
api.get('/memories/:id/tags', (c) => {
  const id = c.req.param('id');
  const tags = getMemoryTags(id);
  return c.json({ data: tags });
});

api.put('/memories/:id/tags', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const tagIds = validateStringArray(body.tagIds, 'tagIds');
  assignTagsToMemory(id, tagIds);
  return c.json({ success: true });
});

// Memory links
api.get('/memories/:id/links', (c) => {
  const id = c.req.param('id');
  const depth = parseInt(c.req.query('depth') || '0');
  const graph = getMemoryLinks(id, depth);
  return c.json({ data: graph });
});

api.post('/memories/:id/links', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  if (!body.targetId) throw new ValidationError('targetId required');

  const link = createLink(id, body.targetId, body.linkType, body.weight, body.label);
  return c.json({ data: link }, 201);
});

// Tags
api.get('/tags', (c) => {
  const tags = listTags();
  return c.json({ data: tags });
});

api.post('/tags', async (c) => {
  const body = await c.req.json();
  if (!body.name) throw new ValidationError('name is required');

  const tag = createTag(body.name, body.parentId, body.description);
  return c.json({ data: tag }, 201);
});

api.delete('/tags/:id', (c) => {
  const id = c.req.param('id');
  try {
    if (deleteTag(id)) return c.json({ success: true });
    throw new NotFoundError('Tag', id);
  } catch (e: unknown) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError((e as Error).message);
  }
});

api.get('/tags/hierarchy', (c) => {
  const tree = getTagHierarchy();
  return c.json({ data: tree });
});

// Links
api.get('/links', (c) => {
  const stats = getLinkStats();
  return c.json({ data: stats });
});

api.delete('/links/:id', (c) => {
  const id = c.req.param('id');
  if (deleteLink(id)) return c.json({ success: true });
  throw new NotFoundError('Link', id);
});

// Search
api.get('/search', (c) => {
  const q = c.req.query('q') || '';
  const tier = c.req.query('tier') || undefined;
  const tag = c.req.query('tag') || undefined;
  const limit = parseInt(c.req.query('limit') || '50');

  if (!q) return c.json({ data: [], count: 0 });

  const results = searchMemories(q, { tier, tag, limit });
  return c.json({ data: results, count: results.length });
});

// Stats
api.get('/stats', (c) => {
  const stats = getStats();
  const linkStats = getLinkStats();
  return c.json({ data: { ...stats, linkStats } });
});

// Agents
api.get('/agents', (c) => {
  return c.json({ data: listBuiltinAgents() });
});

api.get('/agents/:id', (c) => {
  const id = c.req.param('id');
  const agent = getBuiltinAgent(id);
  if (!agent) throw new NotFoundError('Agent', id);
  return c.json({ data: agent });
});

api.post('/agents/:id/run', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const agent = getBuiltinAgent(id);
  if (!agent) throw new NotFoundError('Agent', id);

  const result = await runAgent(agent, body.input);
  return c.json({ data: result });
});

api.get('/agents/runs', (c) => {
  const db = getDb();
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
