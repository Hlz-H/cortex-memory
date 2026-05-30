import { getConfig } from '../config';

export interface OllamaResponse {
  response: string;
  done: boolean;
}

export async function generateWithOllama(prompt: string, system?: string): Promise<OllamaResponse> {
  const config = getConfig();
  const res = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.defaultModel,
      prompt,
      system,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error');
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  return res.json() as Promise<OllamaResponse>;
}

export async function checkOllama(): Promise<boolean> {
  try {
    const config = getConfig();
    const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
