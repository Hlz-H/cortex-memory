import { createMemory, listMemories, getMemory, updateMemory, deleteMemory, promoteMemory, demoteMemory } from '../memory/store';
import { searchMemories } from '../memory/search';
import { getMemoryTags } from '../tags/index';
import { NotFoundError } from '../utils/error';
import { categorizeWithTags } from '../tools/categorize';

function getShortId(id: string): string { return id.substring(0, 8); }
function truncate(str: string, len: number): string { return str.length > len ? str.substring(0, len) + '...' : str; }

export function addCommand(content: string, options: { tag?: string[]; category?: string; important?: boolean; instant?: boolean }): void {
  const tier = options.important ? 'longterm' : options.instant ? 'instant' : 'shortterm';
  const category = options.category || categorizeWithTags(content, options.tag);
  const mem = createMemory(content, tier, category, undefined, options.tag);
  console.log(`✓ Added (${mem.tier}/${category}): ${truncate(mem.content, 60)}`);
  console.log(`  ID: ${mem.id}`);
  if (mem.tags && mem.tags.length > 0) {
    console.log(`  Tags: ${mem.tags.map(t => t.name).join(', ')}`);
  }
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
    console.log('No memories found.');
    return;
  }

  console.log(`\n${memories.length} memories:\n`);
  for (const mem of memories) {
    const tags = mem.tags && mem.tags.length > 0 ? ` [${mem.tags.map(t => t.name).join(', ')}]` : '';
    console.log(`  ${getShortId(mem.id)}  ${mem.tier.padEnd(10)} ${truncate(mem.content, 57)}${tags}`);
  }
  console.log();
}

export function searchCommand(query: string, options: { tier?: string; tag?: string }): void {
  const results = searchMemories(query, { tier: options.tier, tag: options.tag });
  if (results.length === 0) {
    console.log(`No results for "${query}".`);
    return;
  }
  console.log(`\n${results.length} results for "${query}":\n`);
  for (const mem of results) {
    const tags = mem.tags && mem.tags.length > 0 ? ` [${mem.tags.map((t: any) => t.name).join(', ')}]` : '';
    console.log(`  ${getShortId(mem.id)}  ${mem.tier.padEnd(10)} ${truncate(mem.content, 57)}${tags}`);
  }
  console.log();
}

export function promoteCommand(id: string): void {
  try {
    const mem = promoteMemory(id);
    if (!mem) throw new NotFoundError('Memory', id);
    console.log(`✓ Promoted to ${mem.tier}: ${truncate(mem.content, 60)}`);
  } catch (e: unknown) {
    console.error(`Error: ${(e as Error).message}`);
    process.exit(1);
  }
}

export function demoteCommand(id: string): void {
  try {
    const mem = demoteMemory(id);
    if (!mem) throw new NotFoundError('Memory', id);
    console.log(`✓ Demoted to ${mem.tier}: ${truncate(mem.content, 60)}`);
  } catch (e: unknown) {
    console.error(`Error: ${(e as Error).message}`);
    process.exit(1);
  }
}

export function forgetCommand(id: string): void {
  if (deleteMemory(id)) {
    console.log(`✓ Deleted memory ${getShortId(id)}`);
  } else {
    console.error(`Memory not found: ${id}`);
    process.exit(1);
  }
}
