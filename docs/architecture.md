# Architecture

MemoRail is organized around four boundaries:

```text
Agent
  |
  | MCP / CLI / SDK / native adapter
  v
MemoRail runtime
  |
  +-- core: schema, storage, index, prompt protocol, validation
  +-- extractor: after-turn memory extraction through host-provided LLM runner
  +-- doctor: health checks, conflicts, duplicates, sensitive data findings
  +-- server: stdio MCP integration surface
  |
  v
File-native memory root
```

The core package must not depend on any specific agent product, model provider,
desktop runtime, or hosted service.

## Storage

MemoRail separates the fact source from runtime indexes:

```text
Markdown memory files
  |
  +-- MEMORY.md
  +-- memory.json
  +-- entities.json
  +-- bm25.json
  +-- audit.log.jsonl
```

Only Markdown files are the durable fact source. All indexes are derived and can
be rebuilt from Markdown.
