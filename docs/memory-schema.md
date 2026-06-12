# Memory Schema

MemoRail stores memory as Markdown files with YAML frontmatter.

```yaml
---
type: preference
scope: user
summary: User prefers direct Chinese answers with tables.
origin: manual
source_ref: docs-example
confidence: high
status: active
created_at: 2026-06-12T00:00:00.000Z
updated_at: 2026-06-12T00:00:00.000Z
---
```

The Markdown body contains the durable memory text. The frontmatter is the
machine-readable contract used by the CLI, SDK, and MCP server.

Supported memory types:

| Type | Meaning |
| --- | --- |
| identity | Stable facts about the user or agent identity |
| preference | User preferences and durable choices |
| style | Communication and output style |
| workflow | Reusable working patterns |
| context | Project or environment context |
| ambient | Low-priority hints that may become stale |

Derived files such as `MEMORY.md`, `memory.json`, `entities.json`, and
`bm25.json` are runtime indexes. They can be deleted and rebuilt from Markdown.
