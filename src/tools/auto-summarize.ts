import { createMemory } from '../memory/store';
import { getLogger } from '../utils/logger';
import { generateWithOllama } from '../agent/ollama';

const logger = getLogger();

export interface AutoSummarizeOptions {
  text: string;
  context?: string;
  tier?: string;
  category?: string;
}

export async function autoSummarize(options: AutoSummarizeOptions): Promise<string[]> {
  if (!options.text || options.text.trim().length === 0) {
    return [];
  }

  const prompt = `Summarize the following text into 1-5 concise memory points.
Each point should be a single sentence capturing an important fact, decision, or action item.
Return ONLY a JSON array of strings. No extra text.

Text to summarize:
${options.text}`;

  try {
    const result = await generateWithOllama(prompt);
    let points: string[] = [];

    try {
      const parsed = JSON.parse(result.response);
      points = Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      // Fallback: split by newlines and clean up
      points = result.response
        .split(/\n+/)
        .map((line) => line.replace(/^[-*\d.\s\[\]"]+/, '').trim())
        .filter((line) => line.length > 10 && line.length < 300);
    }

    const tier = options.tier || 'shortterm';
    const category = options.category || 'auto-summary';
    const memoryIds: string[] = [];

    for (const point of points) {
      if (point.trim()) {
        const mem = createMemory(point.trim(), tier, category, undefined, ['auto-summarize']);
        memoryIds.push(mem.id);
      }
    }

    logger.info(`Auto-summarized ${memoryIds.length} memories from ${options.text.length} chars`);
    return memoryIds;
  } catch (error) {
    logger.error('Auto-summarize failed: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

export async function autoSummarizeSession(text: string): Promise<string[]> {
  return autoSummarize({
    text,
    tier: 'shortterm',
    category: 'session-summary',
  });
}
