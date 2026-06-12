# Architecture

MemoRail is organized around four boundaries:

```text
Agent
  |
  | MCP / CLI / SDK / HTTP
  v
MemoRail runtime
  |
  +-- core: schema, storage, index, prompt protocol, validation
  +-- extractor: after-turn memory extraction through host-provided LLM runner
  +-- doctor: health checks, conflicts, duplicates, sensitive data findings
  +-- server: MCP and HTTP integration surfaces
  |
  v
File-native memory root
```

The core package must not depend on any specific agent product, model provider,
desktop runtime, or hosted service.

