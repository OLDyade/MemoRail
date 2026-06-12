import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

test("MCP handler lists tools and runs save/recall round trip", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "memorail-mcp-"));
  process.env.MEMORAIL_ROOT = root;
  try {
    const { handleRequest } = await import("./index.js");
    const initialized = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {}
    }) as { serverInfo: { name: string } };
    assert.equal(initialized.serverInfo.name, "memorail");

    const listed = await handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    }) as { tools: Array<{ name: string }> };
    assert.equal(listed.tools.some((tool) => tool.name === "memory_save"), true);

    await handleRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "memory_save",
        arguments: {
          type: "context",
          scope: "project",
          summary: "OpenCode uses stdio MCP",
          body: "OpenCode can connect to MemoRail through stdio MCP.",
          project: "memorail"
        }
      }
    });

    const recalled = await handleRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "memory_recall",
        arguments: {
          query: "OpenCode MCP",
          project: "memorail"
        }
      }
    }) as { content: Array<{ text: string }> };
    assert.match(recalled.content[0].text, /OpenCode uses stdio MCP/);
  } finally {
    delete process.env.MEMORAIL_ROOT;
    await rm(root, { recursive: true, force: true });
  }
});
