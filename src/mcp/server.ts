import { initDatabase } from '../db/database';
import { getToolDescriptions, executeTool } from '../agent/tools';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

const TOOLS = [
  {
    name: 'read_memory',
    description: 'Read a memory by its ID. Returns full memory with tags and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Memory ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'search_memories',
    description: 'Search memories by query text. Supports filtering by tier or tag.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query text' },
        tier: { type: 'string', description: 'Filter by tier (permanent/longterm/shortterm/instant)' },
        tag: { type: 'string', description: 'Filter by tag name' },
        limit: { type: 'number', description: 'Max results (default 50)' }
      },
      required: ['query']
    }
  },
  {
    name: 'write_memory',
    description: 'Create a new memory. Default tier is shortterm.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Memory content' },
        tier: { type: 'string', description: 'Tier: permanent/longterm/shortterm/instant' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tag names to assign' },
        category: { type: 'string', description: 'Category' },
        importance: { type: 'number', description: 'Importance score 0.1-10' }
      },
      required: ['content']
    }
  },
  {
    name: 'link_memories',
    description: 'Create a bidirectional link between two memories.',
    inputSchema: {
      type: 'object',
      properties: {
        source_id: { type: 'string', description: 'Source memory ID' },
        target_id: { type: 'string', description: 'Target memory ID' },
        link_type: { type: 'string', description: 'Link type: related_to/depends_on/derived_from/contradicts/generalizes/sequential' },
        weight: { type: 'number', description: 'Link weight 0-1' }
      },
      required: ['source_id', 'target_id']
    }
  },
  {
    name: 'list_tags',
    description: 'List all tags in the memory system.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_stats',
    description: 'Get system statistics: memory counts by tier, tag count, link count.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_memory_links',
    description: 'Get linked memories for a given memory ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Memory ID' },
        depth: { type: 'number', description: 'Traversal depth (0=direct only)' }
      },
      required: ['id']
    }
  }
];

export function startMcpServer(): void {
  initDatabase();

  const { stdin, stdout } = process;
  let buffer = '';

  stdin.setEncoding('utf8');
  stdin.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) handleRequest(line.trim());
    }
  });

  function handleRequest(line: string): void {
    try {
      const req = JSON.parse(line) as MCPRequest;
      const res = processMethod(req);
      stdout.write(JSON.stringify(res) + '\n');
    } catch {
      // Ignore invalid JSON
    }
  }

  function processMethod(req: MCPRequest): MCPResponse {
    switch (req.method) {
      case 'initialize':
        return { jsonrpc: '2.0', id: req.id, result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'cortex', version: '0.1.0' }
        }};

      case 'tools/list':
        return { jsonrpc: '2.0', id: req.id, result: { tools: TOOLS } };

      case 'tools/call': {
        const params = req.params || {};
        const toolName = params.name as string;
        const toolArgs = (params.arguments as Record<string, unknown>) || {};

        if (!toolName) {
          return { jsonrpc: '2.0', id: req.id, error: { code: -32602, message: 'Tool name required' } };
        }

        try {
          const result = executeTool(toolName, toolArgs);
          return { jsonrpc: '2.0', id: req.id, result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          }};
        } catch (e: unknown) {
          return { jsonrpc: '2.0', id: req.id, result: {
            content: [{ type: 'text', text: `Error: ${(e as Error).message}` }],
            isError: true
          }};
        }
      }

      default:
        return { jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `Method not found: ${req.method}` } };
    }
  }

  // Keep process alive
  stdin.on('end', () => process.exit(0));
}
