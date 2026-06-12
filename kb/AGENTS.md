# MemoRail Knowledge Base Rules

This folder is the project knowledge base for MemoRail. It is not a runtime
memory root and must not be used as user memory storage.

## Structure

```text
kb/
  AGENTS.md
  index.md
  log.md
  raw/
    sources.md
  wiki/
    overview.md
    glossary.md
    open-questions.md
    domains/
    integrations/
    operations/
    security/
```

## Rules

- Treat `kb/raw/` as source registration. Do not invent sources.
- Compile stable knowledge into `kb/wiki/`.
- Update `kb/index.md` whenever wiki pages are added or materially changed.
- Append to `kb/log.md` for ingest, decision, refactor, and supersede actions.
- Do not store secrets, private transcripts, raw tool outputs, or large diffs.
- If sources conflict, record the conflict. Do not silently overwrite a prior
  decision.
- If a conclusion is not settled, keep it in `wiki/open-questions.md`.

## Page Frontmatter

Wiki pages should start with:

```yaml
---
id: short-stable-id
type: overview | glossary | decision | domain | integration | operation | security
status: draft | active | superseded
source_refs:
  - MR-SRC-0001
updated_at: 2026-06-12
tags:
  - memorail
summary: One sentence summary.
---
```
