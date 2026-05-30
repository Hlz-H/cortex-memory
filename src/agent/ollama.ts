export interface OllamaResponse {
  response: string;
  done: boolean;
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  format?: string;
  options?: Record<string, unknown>;
}

export async function generateWithOllama(req: OllamaRequest): Promise<OllamaResponse> {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: req.model,
      prompt: req.prompt,
      system: req.system,
      stream: false,
      format: req.format,
      options: req.options
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error');
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  return res.json() as Promise<OllamaResponse>;
}

export async function checkOllama(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { timeout: 3000 } as RequestInit);
    return res.ok;
  } catch {
    return false;
  }
}
