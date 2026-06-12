# OpenCode MCP

OpenCode can connect to MemoRail as a local stdio MCP server after MemoRail is
built.

```jsonc
{
  "mcp": {
    "memorail": {
      "type": "local",
      "command": ["node", "/absolute/path/to/MemoRail/packages/mcp-server/dist/index.js"],
      "env": {
        "MEMORAIL_ROOT": "/absolute/path/to/.memorail"
      }
    }
  }
}
```

This is a generic MCP integration. Native OpenCode lifecycle hooks are a future
adapter surface and should not be advertised as complete until a smoke test is
included.
