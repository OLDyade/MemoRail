---
id: overview
type: overview
status: active
source_refs:
  - MR-SRC-0001
  - MR-SRC-0002
updated_at: 2026-06-12
tags:
  - positioning
summary: MemoRail is a local-first, file-native memory runtime for agents.
---

# Overview

MemoRail is a local-first memory runtime for coding agents and autonomous
agents. It is not a hosted memory API, vector database, or general RAG
framework.

The core product boundary is:

```text
agent / host adapter
  -> MemoRail CLI, SDK, or MCP
  -> Markdown fact source
  -> rebuildable indexes
```

The first public release should prove a small, reliable memory loop rather than
claim a broad hosted platform.
