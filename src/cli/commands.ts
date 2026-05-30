import { initDatabase, closeDatabase } from '../db/database';
import { createMemory, listMemories, getMemory, deleteMemory, promoteMemory, demoteMemory, getStats } from '../memory/store';
import { searchMemories } from '../memory/search';
import * as tags from '../tags/index';
import * as links from '../links/index';

function fmt(s: string, len: number): string {
  if (!s) return ''.padEnd(len);
  return (s.length > len ? s.substring(0, len - 3) + '...' : s).padEnd(len);
}

export function initCommand(): void {
  initDatabase();
  console.log('Initialized Cortex memory database');
}

export function addCommand(content: string, options: { tag?: string[]; category?: string; important?: boolean; instant?: boolean }): void {
  let tier = 'shortterm';
  if (options.important) tier = 'longterm';
  if (options.instant) tier = 'instant';

  const mem = createMemory(content, tier, options.category, undefined, options.tag);
  console.log(`Created memory (${mem.tier}): ${mem.id.substring(0, 8)}`);
  console.log(`  Content: ${content.substring(0, 80)}`);
  if (options.tag) console.log(`  Tags: ${options.tag.join(', ')}`);
}

export function listCommand(options: { tier?: string; tag?: string; category?: string; limit?: number; offset?: number }): void {
  const memories = listMemories({
    tier: options.tier,
    tag: options.tag,
    category: options.category,
    limit: options.limit || 50,
    offset: options.offset || 0,
  });

  if (memories.length === 0) {
    console.log('No memories found');
    return;
  }

  console.log(`\n  ${'ID'.padEnd(10)} ${'Tier'.padEnd(12)} ${'Content'.padEnd(60)} ${'Tags'}`);
  console.log(`  ${''.padEnd(10, '-')} ${''.padEnd(12, '-')} ${''.padEnd(60, '-')} ${''.padEnd(20, '-')}`);
  for (const m of memories) {
    const tagNames = (m.tags || []).map(t => t.name).join(', ');
    console.log(`  ${m.id.substring(0, 8).padEnd(10)} ${m.tier.padEnd(12)} ${fmt(m.content, 57)} ${fmt(tagNames, 20)}`);
  }
  console.log(`\n  ${memories.length} memories shown`);
}

export function searchCommand(query: string, options: { tier?: string; tag?: string }): void {
  const results = searchMemories(query, { tier: options.tier, tag: options.tag });
  if (results.length === 0) {
    console.log('No results found');
    return;
  }
  console.log(`\n  ${'ID'.padEnd(10)} ${'Tier'.padEnd(12)} ${'Content'.padEnd(60)} ${'Tags'}`);
  console.log(`  ${''.padEnd(10, '-')} ${''.padEnd(12, '-')} ${''.padEnd(60, '-')} ${''.padEnd(20, '-')}`);
  for (const m of results) {
    const tagNames = m.tags.map(t => t.name).join(', ');
    console.log(`  ${m.id.substring(0, 8).padEnd(10)} ${m.tier.padEnd(12)} ${fmt(m.content, 57)} ${fmt(tagNames, 20)}`);
  }
  console.log(`\n  ${results.length} results`);
}

export function promoteCommand(id: string): void {
  const mem = promoteMemory(id);
  if (!mem) { console.log('Memory not found'); return; }
  console.log(`Promoted ${id.substring(0, 8)} to ${mem.tier}`);
}

export function demoteCommand(id: string): void {
  const mem = demoteMemory(id);
  if (!mem) { console.log('Memory not found'); return; }
  console.log(`Demoted ${id.substring(0, 8)} to ${mem.tier}`);
}

export function forgetCommand(id: string): void {
  if (deleteMemory(id)) {
    console.log(`Deleted memory ${id.substring(0, 8)}`);
  } else {
    console.log('Memory not found');
  }
}

export function getCommand(id: string): void {
  const mem = getMemory(id);
  if (!mem) { console.log('Memory not found'); return; }
  const tagNames = (mem.tags || []).map(t => t.name).join(', ');
  console.log(`\n  ID: ${mem.id}`);
  console.log(`  Content: ${mem.content}`);
  console.log(`  Tier: ${mem.tier}`);
  console.log(`  Category: ${mem.category || '(none)'}`);
  console.log(`  Importance: ${mem.importance}`);
  console.log(`  Tags: ${tagNames || '(none)'}`);
  console.log(`  Created: ${mem.created_at}`);
  console.log(`  Accessed: ${mem.accessed_at} (${mem.access_count}x)`);
}

export function tagCommand(subcommand: string, args: string[]): void {
  switch (subcommand) {
    case 'create': {
      const name = args[0];
      if (!name) { console.log('Usage: cortex tag create <name> [parentId]'); return; }
      const tag = tags.createTag(name, args[1]);
      console.log(`Created tag: ${tag.name} (${tag.id.substring(0, 8)})`);
      break;
    }
    case 'delete': {
      const id = args[0];
      if (!id) { console.log('Usage: cortex tag delete <id>'); return; }
      try {
        tags.deleteTag(id);
        console.log(`Deleted tag ${id.substring(0, 8)}`);
      } catch (e: unknown) {
        console.log(`Error: ${(e as Error).message}`);
      }
      break;
    }
    case 'list': {
      const all = tags.listTags();
      if (all.length === 0) { console.log('No tags'); return; }
      console.log(`\n  ${'ID'.padEnd(10)} ${'Name'.padEnd(25)} ${'Parent'.padEnd(10)} ${'Memories'}`);
      console.log(`  ${''.padEnd(10, '-')} ${''.padEnd(25, '-')} ${''.padEnd(10, '-')} ${''.padEnd(10, '-')}`);
      for (const t of all) {
        const cnt = (() => { try { const db = require('../db/database').getDatabase(); return (db.prepare('SELECT COUNT(*) as cnt FROM memory_tags WHERE tag_id = ?').get(t.id) as { cnt: number }).cnt; } catch { return 0; } })();
        console.log(`  ${t.id.substring(0, 8).padEnd(10)} ${t.name.padEnd(25)} ${(t.parent_id || '').substring(0, 8).padEnd(10)} ${String(cnt).padEnd(10)}`);
      }
      break;
    }
    default:
      console.log(`Unknown tag subcommand: ${subcommand}. Use: create, delete, list`);
  }
}

export function linkCommand(sourceId: string, targetId: string, options: { type?: string; weight?: number }): void {
  try {
    const link = links.createLink(sourceId, targetId, options.type, options.weight);
    console.log(`Created link: ${sourceId.substring(0, 8)} --[${link.link_type}]--> ${targetId.substring(0, 8)}`);
  } catch (e: unknown) {
    console.log(`Error: ${(e as Error).message}`);
  }
}

export function serveCommand(options: { port?: number }): void {
  const { startServer } = require('../api/server');
  startServer(options.port || 3456);
}

export function statsCommand(): void {
  const s = getStats();
  console.log('\n  Cortex Memory Statistics');
  console.log(`  ${''.padEnd(30, '=')}`);
  console.log(`  Total memories: ${s.total}`);
  console.log(`  By tier:`);
  for (const [tier, count] of Object.entries(s.by_tier)) {
    console.log(`    ${tier.padEnd(12)} ${count}`);
  }
  console.log(`  Total tags: ${s.total_tags}`);
  console.log(`  Total links: ${s.total_links}`);

  const linkStats = links.getLinkStats();
  if (linkStats.length > 0) {
    console.log(`  Links by type:`);
    for (const ls of linkStats) {
      console.log(`    ${ls.link_type.padEnd(20)} ${ls.count}`);
    }
  }
}

export function agentListCommand(): void {
  const { listBuiltinAgents } = require('../agent/builtins');
  const agents = listBuiltinAgents();
  console.log(`\n  ${'ID'.padEnd(15)} ${'Name'.padEnd(25)} ${'Model'.padEnd(12)} ${'Status'}`);
  console.log(`  ${''.padEnd(15, '-')} ${''.padEnd(25, '-')} ${''.padEnd(12, '-')} ${''.padEnd(10, '-')}`);
  for (const a of agents) {
    console.log(`  ${a.id.padEnd(15)} ${a.name.padEnd(25)} ${a.model.padEnd(12)} ${a.status}`);
  }
  console.log();
}

export function mcpCommand(): void {
  const { startMcpServer } = require('../mcp/server');
  startMcpServer();
}

export async function agentRunCommand(id: string): Promise<void> {
  const { getBuiltinAgent } = require('../agent/builtins');
  const { runAgent } = require('../agent/runner');
  const { checkOllama } = require('../agent/ollama');

  const ollamaReady = await checkOllama();
  if (!ollamaReady) {
    console.error('Ollama is not running. Start it with: ollama serve');
    process.exit(1);
  }

  const agent = getBuiltinAgent(id);
  if (!agent) {
    console.error(`Unknown agent: ${id}`);
    console.error('Available: consolidator, summarizer, link_miner, archivist');
    process.exit(1);
  }

  console.log(`Running agent: ${agent.name}...`);
  const result = await runAgent(agent);

  if (result.status === 'success') {
    console.log(`✓ Agent completed successfully`);
    console.log(`  Tool calls: ${result.tool_calls?.length || 0}`);
    if (result.output) {
      const output = JSON.parse(result.output);
      console.log(`  Reasoning: ${output.reasoning?.substring(0, 200)}`);
    }
  } else {
    console.error(`✗ Agent failed: ${result.error}`);
    process.exit(1);
  }
}
