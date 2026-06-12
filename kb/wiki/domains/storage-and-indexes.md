---
id: storage-and-indexes
type: domain
status: active
source_refs:
  - MR-SRC-0001
  - MR-SRC-0002
updated_at: 2026-06-12
tags:
  - storage
  - index
summary: Markdown is the fact source; runtime indexes are derived and rebuildable.
---

# Storage And Indexes

MemoRail stores long-term memories as Markdown files with strict YAML
frontmatter. These files are the fact source.

Derived runtime indexes:

| File | Purpose |
| --- | --- |
| `MEMORY.md` | Agent-readable memory index. |
| `memory.json` | Machine-readable manifest. |
| `entities.json` | Entity-to-memory lookup. |
| `bm25.json` | Lightweight lexical index. |
| `audit.log.jsonl` | Append-only state change log. |

Indexes must be rebuildable from Markdown. A broken derived index is a doctor
finding, not a source of truth.
