#!/usr/bin/env node

import process from "node:process";
import {
  archiveMemory,
  buildContext,
  doctor,
  initMemoryRoot,
  readMemory,
  searchMemories,
  writeMemory,
  type MemoryScope,
  type MemoryType
} from "@memorail/core";

type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

const root = process.env.MEMORAIL_ROOT ?? ".memorail";

const tools = [
  {
    name: "memory_context",
    description: "Build a MemoRail memory context prelude for the current task.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
        scope: { type: "string" },
        project: { type: "string" }
      },
      required: ["query"]
    }
  },
  {
    name: "memory_recall",
    description: "Search MemoRail memories by query.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
        scope: { type: "string" },
        project: { type: "string" }
      },
      required: ["query"]
    }
  },
  {
    name: "memory_read",
    description: "Read a specific MemoRail memory by path.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      required: ["path"]
    }
  },
  {
    name: "memory_save",
    description: "Save a curated long-term memory candidate.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        scope: { type: "string" },
        summary: { type: "string" },
        body: { type: "string" },
        source_ref: { type: "string" },
        confidence: { type: "string" },
        agent: { type: "string" },
        project: { type: "string" },
        session: { type: "string" },
        supersedes: { type: "string" }
      },
      required: ["type", "scope", "summary", "body"]
    }
  },
  {
    name: "memory_archive",
    description: "Archive a MemoRail memory so it leaves default recall.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        reason: { type: "string" }
      },
      required: ["path"]
    }
  },
  {
    name: "memory_doctor",
    description: "Run read-only health checks for the MemoRail memory root.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

export async function handleRequest(request: JsonRpcRequest): Promise<unknown> {
  switch (request.method) {
    case "initialize":
      await initMemoryRoot(root);
      return {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "memorail", version: "0.0.0" }
      };
    case "tools/list":
      return { tools };
    case "tools/call":
      return callTool(request.params ?? {});
    default:
      throw new Error(`Unsupported method: ${request.method}`);
  }
}

async function callTool(params: Record<string, unknown>): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const name = requireString(params.name, "name");
  const args = (params.arguments ?? {}) as Record<string, unknown>;
  let result: unknown;

  switch (name) {
    case "memory_context":
      result = await buildContext({
        root,
        query: requireString(args.query, "query"),
        limit: optionalNumber(args.limit),
        scope: optionalString(args.scope) as MemoryScope | undefined,
        project: optionalString(args.project)
      });
      break;
    case "memory_recall":
      result = await searchMemories(root, requireString(args.query, "query"), {
        limit: optionalNumber(args.limit),
        scope: optionalString(args.scope) as MemoryScope | undefined,
        project: optionalString(args.project)
      });
      break;
    case "memory_read":
      result = await readMemory(root, requireString(args.path, "path"));
      break;
    case "memory_save":
      result = await writeMemory(root, {
        type: requireString(args.type, "type") as MemoryType,
        scope: requireString(args.scope, "scope") as MemoryScope,
        summary: requireString(args.summary, "summary"),
        body: requireString(args.body, "body"),
        origin: "adapter",
        source_ref: optionalString(args.source_ref) ?? "mcp",
        confidence: optionalString(args.confidence) as "low" | "medium" | "high" | undefined,
        agent: optionalString(args.agent),
        project: optionalString(args.project),
        session: optionalString(args.session),
        supersedes: optionalString(args.supersedes)
      });
      break;
    case "memory_archive":
      result = await archiveMemory(root, requireString(args.path, "path"), optionalString(args.reason) ?? "mcp");
      break;
    case "memory_doctor":
      result = await doctor(root);
      break;
    default:
      throw new Error(`Unknown MemoRail tool: ${name}`);
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
  };
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Missing required field: ${name}`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number: ${value}`);
  return parsed;
}

function writeResponse(id: JsonRpcRequest["id"], result: unknown): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function writeError(id: JsonRpcRequest["id"], error: unknown): void {
  process.stdout.write(`${JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: {
      code: -32000,
      message: error instanceof Error ? error.message : String(error)
    }
  })}\n`);
}

if (process.argv[1]?.endsWith("index.js")) {
  let buffer = "";
  let queue = Promise.resolve();
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      queue = queue.then(() => dispatchLine(line));
    }
  });
}

async function dispatchLine(line: string): Promise<void> {
  let request: JsonRpcRequest | undefined;
  try {
    request = JSON.parse(line) as JsonRpcRequest;
    const result = await handleRequest(request);
    writeResponse(request.id, result);
  } catch (error) {
    writeError(request?.id, error);
  }
}
