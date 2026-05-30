# Cortex Integration for Hermes Agent

Use Cortex as Hermes' external memory backend.

## What It Does

- **cortex_search** — Full-text search across your local Cortex memory (supports Chinese)
- **cortex_add** — Persist new facts, decisions, or context into Cortex
- **cortex_get** — Retrieve a specific memory by UUID
- **cortex_link** — Connect related memories into a knowledge graph
- **Automatic prefetch** — Before each turn, Hermes automatically recalls relevant memories from Cortex

## Prerequisites

- Cortex server running on `http://localhost:3456`
- Hermes Agent installed in WSL (`~/.hermes/`)

## Installation

```bash
# 1. Ensure Cortex server is running
cortex serve --port 3456

# 2. Install the plugin (already done if you cloned this repo)
mkdir -p ~/.hermes/plugins/cortex
ln -s ~/projects/cortex/integrations/hermes/cortex_provider.py ~/.hermes/plugins/cortex/__init__.py

# 3. Configure Hermes to use Cortex as memory provider
hermes config set memory.provider cortex

# 4. Start Hermes
hermes
```

## Architecture

```
Hermes Agent (Python)
  └── MemoryManager
        └── CortexMemoryProvider
              └── HTTP REST API
                    └── Cortex Server (Node.js/TypeScript)
                          └── SQLite + FTS5
```

## Configuration

No API keys needed — Cortex is entirely local. The plugin auto-detects Cortex via `GET /api/health`.

If Cortex runs on a different port, edit `CORTEX_BASE_URL` in the provider file.

## Tiers

| Tier | Decay | Use Case |
|------|-------|----------|
| permanent | None | Core knowledge, system prompts |
| longterm | 0.99/day | Important notes, project docs |
| shortterm | 0.90/day | Temporary ideas, conversation notes |
| instant | 0.50/day | Fleeting inspiration |

Hermes can use `cortex_add` with any tier. The model decides importance based on content.
