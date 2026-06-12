# stdio MCP

Build the workspace:

```bash
pnpm install
pnpm build
```

Run the MCP server:

```bash
MEMORAIL_ROOT=.memorail node packages/mcp-server/dist/index.js
```

Available tools:

| Tool | Purpose |
| --- | --- |
| `memory_context` | Build a context prelude. |
| `memory_recall` | Search memory summaries. |
| `memory_read` | Read a memory body by path. |
| `memory_save` | Save a curated memory candidate. |
| `memory_archive` | Archive a memory. |
| `memory_doctor` | Run read-only health checks. |

The server speaks newline-delimited JSON-RPC over stdio.
