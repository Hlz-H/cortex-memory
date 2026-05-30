"""Cortex Memory Provider for Hermes Agent.

Integrates Cortex (local AI memory engine) as Hermes' external memory backend.
Cortex must be running on http://localhost:3456.

Installation:
    ln -s /path/to/cortex/integrations/hermes/cortex_provider.py \
          ~/.hermes/plugins/cortex/__init__.py

Then set in ~/.hermes/config.yaml:
    memory:
      provider: cortex
"""

import json
import logging
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

# Hermes imports (available when loaded as plugin inside hermes-agent)
from agent.memory_provider import MemoryProvider
from tools.registry import tool_error

logger = logging.getLogger(__name__)

CORTEX_BASE_URL = "http://localhost:3456"


class CortexMemoryProvider(MemoryProvider):
    """Cortex local memory backend for Hermes Agent."""

    def __init__(self) -> None:
        self._session_id = ""
        self._prefetch_result = ""

    @property
    def name(self) -> str:
        return "cortex"

    def is_available(self) -> bool:
        """Check if Cortex server is reachable."""
        try:
            req = urllib.request.Request(
                f"{CORTEX_BASE_URL}/api/health",
                method="GET",
                headers={"Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=2) as resp:
                return resp.status == 200
        except Exception:
            return False

    def initialize(self, session_id: str, **kwargs) -> None:
        self._session_id = session_id

    def system_prompt_block(self) -> str:
        return (
            "# Cortex Memory\n"
            "Your memories are stored in Cortex, a local four-tier AI memory engine.\n"
            "- Use cortex_search to recall relevant past information\n"
            "- Use cortex_add to persist new facts, decisions, or context\n"
            "- Use cortex_get to retrieve a specific memory by ID\n"
            "- Use cortex_link to connect related memories into a knowledge graph\n"
            "Tiers: permanent (core knowledge), longterm (important notes), "
            "shortterm (temporary), instant (fleeting)."
        )

    def prefetch(self, query: str, *, session_id: str = "") -> str:
        """Recall relevant memories before each turn."""
        if not query or len(query.strip()) < 3:
            return ""
        try:
            results = self._api_search(query, limit=5)
            if not results:
                return ""
            lines = []
            for r in results:
                tier = r.get("tier", "unknown")
                content = r.get("content", "")
                tags = ", ".join(
                    t.get("name", "") for t in r.get("tags", [])
                )
                lines.append(
                    f"[{tier}] {content}"
                    + (f" (tags: {tags})" if tags else "")
                )
            return "\n\n".join(lines)
        except Exception as e:
            logger.debug("Cortex prefetch failed: %s", e)
            return ""

    def sync_turn(self, user_content: str, assistant_content: str, *, session_id: str = "") -> None:
        """Optional: could auto-summarize turns into shortterm memories."""
        pass

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "cortex_search",
                    "description": "Search your local Cortex memory for relevant information. Supports Chinese and English full-text search.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query string",
                            },
                            "tier": {
                                "type": "string",
                                "description": "Filter by memory tier: permanent, longterm, shortterm, instant",
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of results to return",
                                "default": 5,
                            },
                        },
                        "required": ["query"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "cortex_add",
                    "description": "Add a new memory to your local Cortex store",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "The memory content to store",
                            },
                            "tier": {
                                "type": "string",
                                "description": "Memory importance tier",
                                "enum": ["permanent", "longterm", "shortterm", "instant"],
                                "default": "shortterm",
                            },
                            "category": {
                                "type": "string",
                                "description": "Optional category label",
                            },
                            "tags": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Tags to assign for organization",
                            },
                        },
                        "required": ["content"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "cortex_get",
                    "description": "Retrieve a specific memory by its UUID",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "id": {
                                "type": "string",
                                "description": "Memory UUID",
                            },
                        },
                        "required": ["id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "cortex_link",
                    "description": "Create a relationship link between two memories",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "source_id": {
                                "type": "string",
                                "description": "Source memory UUID",
                            },
                            "target_id": {
                                "type": "string",
                                "description": "Target memory UUID",
                            },
                            "link_type": {
                                "type": "string",
                                "description": "Relationship type",
                                "default": "related_to",
                            },
                        },
                        "required": ["source_id", "target_id"],
                    },
                },
            },
        ]

    def handle_tool_call(self, tool_name: str, args: Dict[str, Any], **kwargs) -> str:
        try:
            if tool_name == "cortex_search":
                results = self._api_search(
                    args.get("query", ""),
                    tier=args.get("tier"),
                    limit=args.get("limit", 5),
                )
                return json.dumps({"results": results})

            elif tool_name == "cortex_add":
                result = self._api_add(
                    content=args.get("content", ""),
                    tier=args.get("tier", "shortterm"),
                    category=args.get("category"),
                    tags=args.get("tags", []),
                )
                return json.dumps({"success": True, "memory": result})

            elif tool_name == "cortex_get":
                result = self._api_get(args.get("id", ""))
                if result is None:
                    return json.dumps({"error": "Memory not found"})
                return json.dumps({"memory": result})

            elif tool_name == "cortex_link":
                result = self._api_link(
                    source_id=args.get("source_id", ""),
                    target_id=args.get("target_id", ""),
                    link_type=args.get("link_type", "related_to"),
                )
                return json.dumps({"success": True, "link": result})

            else:
                return tool_error(f"Unknown Cortex tool: {tool_name}")
        except Exception as e:
            logger.error("Cortex tool %s failed: %s", tool_name, e)
            return tool_error(f"Cortex {tool_name} failed: {e}")

    # ------------------------------------------------------------------
    # Internal HTTP helpers
    # ------------------------------------------------------------------

    def _api_search(self, query: str, tier: Optional[str] = None, limit: int = 5) -> List[Dict]:
        params = {"q": query, "limit": limit}
        if tier:
            params["tier"] = tier
        qs = urllib.parse.urlencode(params)
        req = urllib.request.Request(
            f"{CORTEX_BASE_URL}/api/search?{qs}",
            headers={"Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _api_add(self, content: str, tier: str = "shortterm", category: Optional[str] = None, tags: Optional[List[str]] = None) -> Dict:
        data: Dict[str, Any] = {"content": content, "tier": tier}
        if category:
            data["category"] = category
        if tags:
            data["tags"] = tags
        req = urllib.request.Request(
            f"{CORTEX_BASE_URL}/api/memories",
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _api_get(self, memory_id: str) -> Optional[Dict]:
        req = urllib.request.Request(
            f"{CORTEX_BASE_URL}/api/memories/{urllib.parse.quote(memory_id)}",
            headers={"Accept": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            raise

    def _api_link(self, source_id: str, target_id: str, link_type: str = "related_to") -> Dict:
        data = {
            "targetId": target_id,
            "linkType": link_type,
        }
        req = urllib.request.Request(
            f"{CORTEX_BASE_URL}/api/memories/{urllib.parse.quote(source_id)}/links",
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))


def register(ctx) -> None:
    """Register Cortex as a memory provider plugin."""
    ctx.register_memory_provider(CortexMemoryProvider())
