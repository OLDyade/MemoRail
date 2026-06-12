# Memory Schema

MemoRail stores memory as Markdown files with YAML frontmatter.

```yaml
---
name: response-style
description: User prefers direct Chinese answers with tables.
type: preference
scope: user
confidence: high
created_at: 2026-06-12T00:00:00.000Z
updated_at: 2026-06-12T00:00:00.000Z
---
```

Supported memory types:

| Type | Meaning |
| --- | --- |
| identity | Stable facts about the user or agent identity |
| preference | User preferences and durable choices |
| style | Communication and output style |
| workflow | Reusable working patterns |
| context | Project or environment context |
| ambient | Low-priority hints that may become stale |

