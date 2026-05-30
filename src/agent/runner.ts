import { generateWithOllama } from './ollama';
import { getToolDescriptions, executeTool } from './tools';
import type { AgentConfig, ToolCall, AgentRun } from './types';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';

export async function runAgent(agent: AgentConfig, input?: string): Promise<AgentRun> {
  const runId = uuidv4();
  const startedAt = new Date().toISOString();

  // Log run start
  const db = getDatabase();
  db.prepare(
    'INSERT INTO agent_runs (id, agent_id, started_at, status, input) VALUES (?, ?, ?, ?, ?)'
  ).run(runId, agent.id, startedAt, 'running', input || null);

  try {
    const toolDesc = getToolDescriptions();
    const prompt = buildAgentPrompt(agent, toolDesc, input);

    const ollamaRes = await generateWithOllama({
      model: agent.model,
      system: agent.systemPrompt,
      prompt,
      format: 'json'
    });

    const parsed = parseAgentOutput(ollamaRes.response);
    const toolResults: unknown[] = [];

    for (const call of parsed.tool_calls || []) {
      try {
        const result = executeTool(call.tool, call.params);
        toolResults.push({ tool: call.tool, result });
      } catch (e: unknown) {
        toolResults.push({ tool: call.tool, error: (e as Error).message });
      }
    }

    const completedAt = new Date().toISOString();
    const output = JSON.stringify({ reasoning: parsed.reasoning, results: toolResults }, null, 2);

    db.prepare(
      'UPDATE agent_runs SET completed_at = ?, status = ?, output = ?, tool_calls = ? WHERE id = ?'
    ).run(completedAt, 'success', output, JSON.stringify(parsed.tool_calls || []), runId);

    return {
      id: runId,
      agent_id: agent.id,
      started_at: startedAt,
      completed_at: completedAt,
      status: 'success',
      input,
      output,
      tool_calls: parsed.tool_calls
    };

  } catch (e: unknown) {
    const completedAt = new Date().toISOString();
    const errorMsg = (e as Error).message;

    db.prepare(
      'UPDATE agent_runs SET completed_at = ?, status = ?, error = ? WHERE id = ?'
    ).run(completedAt, 'error', errorMsg, runId);

    return {
      id: runId,
      agent_id: agent.id,
      started_at: startedAt,
      completed_at: completedAt,
      status: 'error',
      input,
      error: errorMsg
    };
  }
}

function buildAgentPrompt(agent: AgentConfig, toolDesc: string, input?: string): string {
  return `You are ${agent.name}. ${agent.description}

You have access to the following tools. When you want to perform an action, output a JSON object with "tool_calls" array:

${toolDesc}

Output format (JSON):
{
  "reasoning": "your thinking process",
  "tool_calls": [
    {"tool": "tool_name", "params": {...}}
  ]
}

If no action is needed, output:
{
  "reasoning": "why no action",
  "tool_calls": []
}

${input ? `Task: ${input}` : 'Analyze the current memory system and take appropriate actions.'}`;
}

function parseAgentOutput(response: string): { reasoning: string; tool_calls: ToolCall[] } {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { reasoning: 'No JSON found in response', tool_calls: [] };
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      reasoning: parsed.reasoning || '',
      tool_calls: (parsed.tool_calls || []).map((tc: Record<string, unknown>) => ({
        tool: tc.tool as string,
        params: (tc.params as Record<string, unknown>) || {}
      }))
    };
  } catch {
    return { reasoning: 'Failed to parse response: ' + response.substring(0, 200), tool_calls: [] };
  }
}
