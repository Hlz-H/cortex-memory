export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  capabilities: string[];
  schedule?: string;
  status: 'active' | 'paused' | 'error';
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (params: Record<string, unknown>) => unknown;
}

export interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  started_at: string;
  completed_at: string;
  status: 'running' | 'success' | 'error';
  input?: string;
  output?: string;
  tool_calls?: ToolCall[];
  error?: string;
}
