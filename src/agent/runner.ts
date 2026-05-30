import { getConfig } from '../config';
import { generateWithOllama } from './ollama';
import { getToolDescriptions, executeTool } from './tools';
import type { AgentConfig, ToolCall, AgentRun } from './types';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { getLogger } from '../utils/logger';
import { OllamaError } from '../utils/error';

const logger = getLogger();

export async function runAgent(agent: AgentConfig, input?: string): Promise<AgentRun> {
  const config = getConfig();
  const runId = uuidv4();
  const startedAt = new Date().toISOString();

  const db = getDb();
  db.prepare(
    'INSERT INTO agent_runs (id, agent_id, started_at, status, input) VALUES (?, ?, ?, ?, ?)'
  ).run(runId, agent.id, startedAt, 'running', input || null);

  try {
    const toolDesc = getToolDescriptions();
    const prompt = buildAgentPrompt(agent, toolDesc, input);

    // Retry logic with timeout
    let ollamaRes: { response: string } | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < config.agent.maxRetries + 1; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.agent.timeoutMs);

        ollamaRes = await Promise.race([
          generateWithOllama(prompt, agent.systemPrompt),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () => reject(new Error('Agent timeout')));
          }),
        ]);

        clearTimeout(timeout);
        break;
      } catch (e) {
        lastError = e as Error;
        if (attempt < config.agent.maxRetries) {
          logger.warn(`Agent ${agent.id} attempt ${attempt + 1} failed, retrying...`, { error: lastError.message });
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    if (!ollamaRes) {
      throw lastError || new OllamaError('All retries exhausted');
    }

    const parsed = parseAgentOutput(ollamaRes.response);
    const toolResults: unknown[] = [];

    for (const call of parsed.tool_calls || []) {
      try {
        const result = executeTool(call.tool, call.params);
        toolResults.push({ tool: call.tool, result });
        logger.debug(`Agent ${agent.id} executed tool ${call.tool}`, { params: call.params });
      } catch (e: unknown) {
        toolResults.push({ tool: call.tool, error: (e as Error).message });
        logger.warn(`Agent ${agent.id} tool ${call.tool} failed`, { error: (e as Error).message });
      }
    }

    const completedAt = new Date().toISOString();
    const output = JSON.stringify({ reasoning: parsed.reasoning, results: toolResults }, null, 2);

    db.prepare(
      'UPDATE agent_runs SET completed_at = ?, status = ?, output = ?, tool_calls = ? WHERE id = ?'
    ).run(completedAt, 'success', output, JSON.stringify(parsed.tool_calls || []), runId);

    logger.info(`Agent ${agent.id} completed successfully`, { runId, toolCalls: parsed.tool_calls?.length || 0 });

    return {
      id: runId,
      agent_id: agent.id,
      started_at: startedAt,
      completed_at: completedAt,
      status: 'success',
      input,
      output,
      tool_calls: parsed.tool_calls,
    };

  } catch (e: unknown) {
    const completedAt = new Date().toISOString();
    const errorMsg = (e as Error).message;

    db.prepare(
      'UPDATE agent_runs SET completed_at = ?, status = ?, error = ? WHERE id = ?'
    ).run(completedAt, 'error', errorMsg, runId);

    logger.error(`Agent ${agent.id} failed`, { runId, error: errorMsg });

    return {
      id: runId,
      agent_id: agent.id,
      started_at: startedAt,
      completed_at: completedAt,
      status: 'error',
      input,
      error: errorMsg,
    };
  }
}

function buildAgentPrompt(agent: AgentConfig, toolDesc: string, input?: string): string {
  return `You are ${agent.name}. ${agent.description}

You have access to the following tools. When you want to perform an action, output a JSON object with "tool_calls" array:

${toolDesc}

Output format (JSON only):
{
  "reasoning": "your thinking process",
  "tool_calls": [
    {"tool": "tool_name", "params": {...}}
  ]
}

If no action is needed:
{
  "reasoning": "why no action",
  "tool_calls": []
}

${input ? `Task: ${input}` : 'Analyze the current memory system and take appropriate actions.'}`;
}

function parseAgentOutput(response: string): { reasoning: string; tool_calls: ToolCall[] } {
  // Try multiple extraction strategies
  const strategies = [
    // Strategy 1: Extract JSON from markdown code block
    () => {
      const match = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) return JSON.parse(match[1]);
      return null;
    },
    // Strategy 2: Extract first JSON object
    () => {
      const match = response.match(/\{[\s\S]*?\}/);
      if (match) return JSON.parse(match[0]);
      return null;
    },
    // Strategy 3: Try parsing the whole response
    () => JSON.parse(response),
  ];

  for (const strategy of strategies) {
    try {
      const parsed = strategy();
      if (parsed) {
        return {
          reasoning: String(parsed.reasoning || ''),
          tool_calls: (parsed.tool_calls || []).map((tc: Record<string, unknown>) => ({
            tool: String(tc.tool || ''),
            params: (tc.params as Record<string, unknown>) || {},
          })),
        };
      }
    } catch {
      // Try next strategy
    }
  }

  // Fallback: return empty result with raw response as reasoning
  return {
    reasoning: 'Failed to parse structured output. Raw response: ' + response.substring(0, 500),
    tool_calls: [],
  };
}
