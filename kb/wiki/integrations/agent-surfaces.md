---
id: agent-surfaces
type: integration
status: active
source_refs:
  - MR-SRC-0001
  - MR-SRC-0002
updated_at: 2026-06-12
tags:
  - mcp
  - cli
  - sdk
  - adapters
summary: MemoRail uses MCP for generic tool access and adapters for lifecycle integration.
---

# Agent Surfaces

MemoRail has four integration surfaces:

| Surface | Role |
| --- | --- |
| Core | File store, schema, indexes, context, doctor. |
| CLI | Local operation and automation. |
| MCP | Generic agent tool access. |
| Native adapter | Host lifecycle events such as session start, prompt build, turn end, and session end. |

MCP tools should remain small and stable. Native adapters should be explicit
about what is implemented and should pass round-trip smoke tests before being
documented as supported.
