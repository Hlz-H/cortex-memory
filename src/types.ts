export type Tier = 'permanent' | 'longterm' | 'shortterm' | 'instant';

export const VALID_TIERS: Tier[] = ['permanent', 'longterm', 'shortterm', 'instant'];

export function isValidTier(t: string): t is Tier {
  return VALID_TIERS.includes(t as Tier);
}

export function getTierDecayFactor(tier: Tier): number {
  switch (tier) {
    case 'permanent': return 1;
    case 'longterm': return 0.99;
    case 'shortterm': return 0.90;
    case 'instant': return 0.50;
  }
}

export function getTierLevel(tier: Tier): number {
  switch (tier) {
    case 'permanent': return 3;
    case 'longterm': return 2;
    case 'shortterm': return 1;
    case 'instant': return 0;
  }
}

export interface Memory {
  id: string;
  content: string;
  tier: Tier;
  category: string | null;
  importance: number;
  created_at: string;
  accessed_at: string | null;
  access_count: number;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
}

export interface Link {
  id: string;
  source_id: string;
  target_id: string;
  link_type: string;
  weight: number;
  created_at: string;
}

export interface MemoryStats {
  total: number;
  by_tier: Record<Tier, number>;
  total_tags: number;
  total_links: number;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  model: string;
  system_prompt: string;
  query_builder?: (db: any) => any[];
}

export interface AgentResult {
  status: 'success' | 'error';
  agent: string;
  memory_count: number;
  output?: string;
  tool_calls?: { tool: string; params: Record<string, unknown>; result: unknown }[];
  error?: string;
  duration: number;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParam[];
  execute: (params: Record<string, unknown>) => unknown;
}

export interface ToolParam {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}
