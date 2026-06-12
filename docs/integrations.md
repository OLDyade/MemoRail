# Integrations

MemoRail targets first-class integrations with:

| Agent | Integration surface |
| --- | --- |
| Hermes | MCP plus native memory provider adapter |
| OpenCode | stdio MCP plus native lifecycle adapter |
| OpenClaw | MCP plus TypeScript adapter |
| Pi Agent | TypeScript SDK and prompt lifecycle integration |
| Claude Code | stdio MCP |
| Codex | stdio MCP |

MemoRail does not expose REST/OpenAPI as a public integration contract. Native
adapters should call the TypeScript SDK and map host lifecycle events to
MemoRail context, write, extract, and doctor operations.
