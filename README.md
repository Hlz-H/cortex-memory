# Cortex - Local AI Memory Engine

**Cortex** is a professional-grade, local-first AI memory system inspired by human memory architecture. It features a four-tier storage model, on-device intelligent agents, bidirectional memory links, and full MCP (Model Context Protocol) integration.

## Features

- **Four-Tier Memory**: Permanent → Long-term → Short-term → Instant, with automatic Ebbinghaus decay
- **Full-Text Search**: SQLite FTS5 powered, supporting tags, categories, and tiers
- **Knowledge Graph**: Bidirectional memory links with weighted relationships
- **On-Device Agents**: Ollama-powered agents (Consolidator, Summarizer, LinkMiner, Archivist) that run locally
- **REST API**: Hono-based, 24+ endpoints with validation
- **Web UI**: PWA-ready dark-themed interface with htmx
- **CLI**: Full command suite for memory management
- **MCP Server**: stdio JSON-RPC 2.0 server for Cursor, Claude Code, and other MCP clients
- **Zero External APIs**: 100% local, privacy-first

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Cortex v0.1.0                         │
├─────────────────────────────────────────────────────────────┤
│  CLI  │  Web UI  │  REST API  │  MCP Server                │
├─────────────────────────────────────────────────────────────┤
│  Memory Engine (4-tier + FTS5 + Graph)                     │
├─────────────────────────────────────────────────────────────┤
│  Agent System (Ollama + Tools + Retry/Timeout)             │
├─────────────────────────────────────────────────────────────┤
│  SQLite + Config System + Structured Logger                  │
└─────────────────────────────────────────────────────────────┘
```

## Requirements

- Node.js >= 18
- Ollama (for agent features)
- WSL / Linux / macOS / Windows

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Initialize database
cortex init

# Add a memory
cortex add "Learned about four-tier memory systems" -t learning -c research

# List memories
cortex list

# Search
cortex search "memory systems"

# Start web server
cortex serve
# Open http://localhost:3456

# Run an agent
cortex agent run consolidator

# Start MCP server (for Cursor/Claude Code)
cortex mcp
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `cortex init` | Initialize the memory database |
| `cortex add <content>` | Add a memory |
| `cortex list` | List memories with filters |
| `cortex search <query>` | Full-text search |
| `cortex get <id>` | Get memory details |
| `cortex promote <id>` | Move to higher tier |
| `cortex demote <id>` | Move to lower tier |
| `cortex forget <id>` | Delete a memory |
| `cortex tag <create|delete|list>` | Manage tags |
| `cortex link <src> <tgt>` | Link two memories |
| `cortex stats` | Show statistics |
| `cortex serve [--port]` | Start web server |
| `cortex mcp` | Start MCP server |
| `cortex agent list` | List agents |
| `cortex agent run <id>` | Run an agent |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /memories | Create memory |
| GET | /memories | List memories |
| GET | /memories/:id | Get memory |
| PUT | /memories/:id | Update memory |
| DELETE | /memories/:id | Delete memory |
| POST | /memories/:id/promote | Promote tier |
| POST | /memories/:id/demote | Demote tier |
| GET | /memories/search | Search memories |
| GET | /memories/:id/related | Get related |
| GET | /stats | System stats |
| POST | /tags | Create tag |
| GET | /tags | List tags |
| DELETE | /tags/:id | Delete tag |
| POST | /links | Create link |
| GET | /agents | List agents |
| POST | /agents/:id/run | Run agent |
| GET | /config | Get config |
| GET | /config/model | Get model |
| GET | /health | Health check |

## Configuration

Config file: `~/.cortex/config.json`

```json
{
  "dbPath": "~/.cortex/memory.db",
  "serverPort": 3456,
  "ollamaBaseUrl": "http://localhost:11434",
  "defaultModel": "llama3.2",
  "agent": {
    "timeoutMs": 30000,
    "maxRetries": 2
  },
  "logging": {
    "level": "info",
    "file": "~/.cortex/cortex.log"
  }
}
```

Environment variables override config values:
- `CORTEX_DB_PATH`
- `CORTEX_PORT`
- `CORTEX_OLLAMA_URL`
- `CORTEX_MODEL`

## Agent System

Built-in agents run locally via Ollama:

| Agent | ID | Description |
|-------|----|-------------|
| Memory Consolidator | `consolidator` | Promotes high-importance memories |
| Memory Summarizer | `summarizer` | Summarizes related memories |
| Link Miner | `link_miner` | Discovers hidden connections |
| Memory Archivist | `archivist` | Archives old instant memories |

## MCP Integration

Cortex exposes an MCP server over stdio. Add to Cursor/Claude Code settings:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "cortex",
      "args": ["mcp"]
    }
  }
}
```

Available MCP tools: `add_memory`, `search_memories`, `list_memories`, `promote_memory`, `link_memories`, `run_agent`

Available MCP prompts: `memory_query`, `consolidate_memories`

## Development

```bash
npm run dev        # Start dev server
npm run test       # Run tests
npm run test:coverage  # Coverage report
npm run lint       # Lint code
npm run typecheck  # Type check
```

## License

MIT
