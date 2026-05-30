import type { AgentConfig } from './types';

export const BUILTIN_AGENTS: AgentConfig[] = [
  {
    id: 'consolidator',
    name: 'Memory Consolidator',
    description: 'Analyzes memory access patterns and applies Ebbinghaus decay rules. Promotes frequently accessed memories and demotes forgotten ones.',
    model: 'llama3.2',
    systemPrompt: 'You are a memory consolidation agent. Your job is to maintain the memory system by analyzing access patterns and applying decay rules.\n\nRules:\n1. Instant memories older than 48h with no access should be deleted\n2. Short-term memories with 5+ accesses should be promoted to long-term\n3. Long-term memories with 10+ accesses should be promoted to permanent\n4. Memories with decay score below 0.2 should be demoted\n\nUse the available tools to inspect and modify memories. Be conservative - only delete when clearly abandoned.',
    capabilities: ['read_memory', 'search_memories', 'promote_memory', 'demote_memory', 'delete_memory', 'get_stats', 'write_memory'],
    status: 'active'
  },
  {
    id: 'summarizer',
    name: 'Memory Summarizer',
    description: 'Groups related memories and creates summary memories for better organization.',
    model: 'llama3.2',
    systemPrompt: 'You are a memory summarization agent. Your job is to find groups of related memories and create summary memories that capture their essence.\n\nRules:\n1. Search for memories with shared tags or similar content\n2. For groups of 3+ related memories, create a summary memory at longterm tier\n3. Link the summary to the original memories\n4. Tag summaries with the shared tags\n\nUse search and link tools to find and organize related memories.',
    capabilities: ['search_memories', 'read_memory', 'write_memory', 'link_memories', 'list_tags'],
    status: 'active'
  },
  {
    id: 'link_miner',
    name: 'Link Miner',
    description: 'Discovers implicit relationships between memories and suggests/create links.',
    model: 'llama3.2',
    systemPrompt: 'You are a link discovery agent. Your job is to find connections between memories that are not yet explicitly linked.\n\nRules:\n1. Search for memories with overlapping keywords or concepts\n2. For strongly related pairs, create a "related_to" link with weight 0.5-0.8\n3. For dependencies, create "depends_on" links\n4. For derived knowledge, create "derived_from" links\n5. Only link if there is clear semantic connection\n\nUse search and get_memory_links to find candidates, then link_memories to create connections.',
    capabilities: ['search_memories', 'read_memory', 'get_memory_links', 'link_memories', 'get_stats'],
    status: 'active'
  },
  {
    id: 'archivist',
    name: 'Memory Archivist',
    description: 'Archives old and forgotten memories into summary form, preserving knowledge while reducing clutter.',
    model: 'llama3.2',
    systemPrompt: 'You are a memory archivist. Your job is to clean up expired and abandoned memories by archiving them into concise summaries.\n\nRules:\n1. Find instant memories older than 48h that have never been accessed\n2. For abandoned memories in other tiers, create a summary and demote them\n3. Preserve important knowledge in summary form\n4. Delete truly useless memories\n\nUse search to find old memories, write_memory to create archives, and delete_memory to clean up.',
    capabilities: ['search_memories', 'read_memory', 'write_memory', 'delete_memory', 'get_stats', 'demote_memory'],
    status: 'active'
  }
];

export function getBuiltinAgent(id: string): AgentConfig | undefined {
  return BUILTIN_AGENTS.find(a => a.id === id);
}

export function listBuiltinAgents(): AgentConfig[] {
  return BUILTIN_AGENTS;
}
