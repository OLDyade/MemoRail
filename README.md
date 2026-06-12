# MemoRail

File-native memory runtime for AI agents.

MemoRail is an open-source, local-first memory runtime for coding agents and
autonomous agents. It stores long-term memory in auditable local files, builds
rebuildable runtime indexes, exposes a small MCP tool surface, and gives hosts a
clear protocol for reading, writing, validating, and maintaining memory across
sessions.

## Positioning

MemoRail is not a hosted memory API, not a vector database, and not a general
RAG framework. It is a file-native memory protocol and TypeScript runtime for
agents that need transparent local memory.

| Focus | MemoRail approach |
| --- | --- |
| Storage | Markdown fact source + rebuildable runtime indexes |
| Integration | MCP, CLI, and TypeScript SDK |
| Safety | Schema validation, path validation, audit trail |
| Agent fit | Context build, explicit write, host-driven extraction |
| Transparency | Memories are readable and reviewable files |

## Quickstart

```bash
pnpm install
pnpm build

pnpm --filter @memorail/cli exec memorail init --root .memorail
pnpm --filter @memorail/cli exec memorail write \
  --root .memorail \
  --type preference \
  --scope user \
  --summary "User prefers concise tables" \
  --body "The user prefers concise tables when comparing options."
pnpm --filter @memorail/cli exec memorail search --root .memorail "tables"
```

This creates:

```text
.memorail/
  MEMORY.md          agent-readable index
  memory.json        machine-readable manifest
  entities.json      rebuildable entity index
  bm25.json          rebuildable lexical index
  audit.log.jsonl    append-only write audit
  preference/*.md    Markdown fact source
```

## Target Integrations

| Agent | Planned integration surface |
| --- | --- |
| Hermes | MCP plus native memory provider adapter |
| OpenCode | stdio MCP plus native lifecycle hooks |
| OpenClaw | MCP plus TypeScript adapter |
| Pi Agent | TypeScript SDK and prompt lifecycle integration |
| Claude Code | stdio MCP |
| Codex | stdio MCP |

The repository does not claim those native adapters are complete until each has
a runnable example and smoke test.

## Packages

```text
packages/
  core/        memory schema, file store, index, prompt protocol, validator
  cli/         init, list, read, write, search, context, doctor, rebuild-index
  mcp-server/ stdio MCP server
```

## Design Principles

- Local-first: users own the memory files.
- File-native: memory should be inspectable without a service.
- Agent-native: MCP, CLI, and SDK are first-class integration surfaces.
- Auditable: every write should be traceable and reviewable.
- Strict by default: invalid paths, invalid schemas, and sensitive data should
  fail validation instead of being silently accepted.

## Development

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```

## Community

- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security reports: [SECURITY.md](SECURITY.md)
- Support policy: [SUPPORT.md](SUPPORT.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

## Status

MemoRail is pre-1.0. The public schema, MCP tools, and CLI commands may change
before the first stable release.
