# MemoRail Examples

These examples document integration shapes. A target agent is marked runnable
only after a smoke test can start MemoRail, discover tools, and complete a
memory round trip.

| Example | Target | Surface | Status |
| --- | --- | --- | --- |
| [stdio-mcp](stdio-mcp/README.md) | MCP clients, Codex, Claude Code | stdio MCP | Runnable after build |
| [opencode-mcp](opencode-mcp/README.md) | OpenCode | stdio MCP | Config example |
| [adapter-lifecycle](adapter-lifecycle/README.md) | OpenCode, OpenClaw, Hermes, Pi Agent, Codex | native adapter | Contract draft |

MemoRail does not expose REST/OpenAPI as a public integration contract.
