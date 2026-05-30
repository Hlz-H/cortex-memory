import { getDb } from '../db/database';
import { createMemory, getMemory, updateMemory, deleteMemory, listMemories, promoteMemory, demoteMemory, getStats } from '../memory/store';
import { searchMemories } from '../memory/search';
import { createTag, listTags, getMemoryTags, assignTagsToMemory } from '../tags/index';
import { createLink, getMemoryLinks, getLinkStats } from '../links/index';
import type { Tool } from './types';

export const AGENT_TOOLS: Tool[] = [
  {
    name: 'read_memory',
    description: 'Read a memory by its ID',
    parameters: { id: { type: 'string', description: 'Memory ID', required: true } },
    handler: (params) => getMemory(params.id as string),
  },
  {
    name: 'search_memories',
    description: 'Search memories by query text. Supports filtering by tier or tag.',
    parameters: {
      query: { type: 'string', description: 'Search query', required: true },
      tier: { type: 'string', description: 'Filter by tier', required: false },
      tag: { type: 'string', description: 'Filter by tag name', required: false },
      limit: { type: 'number', description: 'Max results', required: false },
    },
    handler: (params) => searchMemories(params.query as string, {
      tier: params.tier as string | undefined,
      tag: params.tag as string | undefined,
      limit: params.limit as number | undefined,
    }),
  },
  {
    name: 'write_memory',
    description: 'Create a new memory. Default tier is shortterm.',
    parameters: {
      content: { type: 'string', description: 'Memory content', required: true },
      tier: { type: 'string', description: 'Tier', required: false },
      tags: { type: 'array', description: 'Tag names', required: false },
      category: { type: 'string', description: 'Category', required: false },
      importance: { type: 'number', description: 'Importance 0.1-10', required: false },
    },
    handler: (params) => createMemory(
      params.content as string,
      (params.tier as string) || 'shortterm',
      params.category as string | undefined,
      undefined,
      params.tags as string[] | undefined,
      (params.importance as number) || 1.0,
    ),
  },
  {
    name: 'link_memories',
    description: 'Create a bidirectional link between two memories',
    parameters: {
      source_id: { type: 'string', description: 'Source memory ID', required: true },
      target_id: { type: 'string', description: 'Target memory ID', required: true },
      link_type: { type: 'string', description: 'Link type', required: false },
      weight: { type: 'number', description: 'Weight 0-1', required: false },
    },
    handler: (params) => createLink(
      params.source_id as string,
      params.target_id as string,
      (params.link_type as string) || 'related_to',
      (params.weight as number) || 1.0,
    ),
  },
  {
    name: 'list_tags',
    description: 'List all tags',
    parameters: {},
    handler: () => listTags(),
  },
  {
    name: 'get_stats',
    description: 'Get system statistics',
    parameters: {},
    handler: () => {
      const stats = getStats();
      const links = getLinkStats();
      return { ...stats, linkStats: links };
    },
  },
  {
    name: 'get_memory_links',
    description: 'Get linked memories for a given memory ID',
    parameters: {
      id: { type: 'string', description: 'Memory ID', required: true },
      depth: { type: 'number', description: 'Traversal depth', required: false },
    },
    handler: (params) => getMemoryLinks(params.id as string, (params.depth as number) || 0),
  },
  {
    name: 'promote_memory',
    description: 'Promote a memory to higher tier',
    parameters: { id: { type: 'string', description: 'Memory ID', required: true } },
    handler: (params) => promoteMemory(params.id as string),
  },
  {
    name: 'demote_memory',
    description: 'Demote a memory to lower tier',
    parameters: { id: { type: 'string', description: 'Memory ID', required: true } },
    handler: (params) => demoteMemory(params.id as string),
  },
  {
    name: 'delete_memory',
    description: 'Delete a memory by ID',
    parameters: { id: { type: 'string', description: 'Memory ID', required: true } },
    handler: (params) => deleteMemory(params.id as string),
  },
];

export function getToolDescriptions(): string {
  return AGENT_TOOLS.map(t => {
    const params = Object.entries(t.parameters)
      .map(([k, v]) => `${k}: ${v.type}${v.required ? ' (required)' : ''} - ${v.description}`)
      .join('\n    ');
    return `- ${t.name}: ${t.description}\n  Parameters:\n    ${params || 'none'}`;
  }).join('\n\n');
}

export function executeTool(name: string, params: Record<string, unknown>): unknown {
  const tool = AGENT_TOOLS.find(t => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.handler(params);
}
