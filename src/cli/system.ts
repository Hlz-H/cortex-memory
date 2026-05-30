import { initDatabase, getDb } from '../db/database';
import { getLogger } from '../utils/logger';
import { getStats } from '../memory/store';
import { getLinkStats } from '../links/index';
import { startServer } from '../api/server';
import { startMcpServer } from '../mcp/server';
import { getMemory } from '../memory/store';
import { autoSummarize } from '../tools/auto-summarize';

const logger = getLogger();

export function initCommand(): void {
  initDatabase();
  logger.info('Initialized Cortex memory database');
  console.log('✓ Cortex database initialized at ~/.cortex/memory.db');
}

export function statsCommand(): void {
  const s = getStats();
  const linkStats = getLinkStats();

  console.log('\n📊 Cortex Statistics\n');
  console.log(`  Total memories: ${s.total}`);
  console.log('  By tier:');
  for (const [tier, count] of Object.entries(s.by_tier)) {
    console.log(`    ${tier.padEnd(12)} ${count}`);
  }
  console.log(`  Total tags:     ${s.total_tags}`);
  console.log(`  Total links:    ${s.total_links}`);
  if (linkStats.length > 0) {
    console.log('  Links by type:');
    for (const ls of linkStats) {
      console.log(`    ${ls.link_type.padEnd(20)} ${ls.count}`);
    }
  }
  console.log();
}

export function serveCommand(options: { port?: number }): void {
  startServer(options.port);
}

export function mcpCommand(): void {
  startMcpServer();
}

export function getCommand(id: string): void {
  const mem = getMemory(id);
  if (!mem) {
    console.error(`Memory not found: ${id}`);
    process.exit(1);
  }
  const tagNames = (mem.tags || []).map((t: { name: string }) => t.name).join(', ');
  console.log(`\n  ID: ${mem.id}`);
  console.log(`  Content: ${mem.content}`);
  console.log(`  Tier: ${mem.tier}`);
  console.log(`  Category: ${mem.category || '(none)'}`);
  console.log(`  Importance: ${mem.importance}`);
  console.log(`  Tags: ${tagNames || '(none)'}`);
  console.log(`  Created: ${mem.created_at}`);
  console.log(`  Accessed: ${mem.accessed_at} (${mem.access_count}x)\n`);
}


export async function autoSummarizeCommand(text: string, options: { tier?: string; category?: string }): Promise<void> {
  const ids = await autoSummarize({ text, tier: options.tier, category: options.category });
  console.log(`✓ Auto-summarized into ${ids.length} memories`);
  for (const id of ids) {
    console.log(`  - ${id}`);
  }
}
