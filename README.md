# MemoRail

File-native memory rails for AI agents.

MemoRail is an open-source memory layer for agents such as Hermes, OpenCode,
OpenClaw, Pi Agent, Claude Code, and Codex. It stores long-term memory in
auditable local files, exposes memory through MCP, and gives agents a clear
protocol for reading, writing, validating, and consolidating memory across
sessions.

## Positioning

MemoRail is not a hosted memory API, not a vector database, and not a general
RAG framework. It is a local-first memory protocol and runtime for agents.

| Focus | MemoRail approach |
| --- | --- |
| Storage | Markdown + YAML frontmatter + JSON manifest |
| Integration | MCP first, CLI and TypeScript SDK included |
| Safety | Schema validation, path validation, audit trail |
| Agent fit | Before-turn context build, after-turn extraction |
| Transparency | Memories are readable and reviewable files |

## Target Integrations

| Agent | Primary integration |
| --- | --- |
| Hermes | Streamable HTTP MCP, REST/OpenAPI |
| OpenCode | stdio MCP, CLI hooks |
| OpenClaw | Streamable HTTP MCP, TypeScript SDK |
| Pi Agent | TypeScript SDK, CLI hooks, prompt protocol |
| Claude Code | stdio MCP |
| Codex | stdio MCP |

## Planned Packages

```text
packages/
  core/        memory schema, file store, index, prompt protocol, validator
  cli/         init, list, read, write, search, extract, doctor, serve
  mcp-server/ stdio and Streamable HTTP MCP server
```

## Design Principles

- Local-first: users own the memory files.
- File-native: memory should be inspectable without a service.
- Agent-native: MCP, CLI, and SDK are first-class integration surfaces.
- Auditable: every write should be traceable and reviewable.
- Strict by default: invalid paths, invalid schemas, and sensitive data should
  fail validation instead of being silently accepted.

## Status

MemoRail is being initialized. The public API and schema are not stable yet.

