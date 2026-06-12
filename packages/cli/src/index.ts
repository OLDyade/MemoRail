#!/usr/bin/env node

import process from "node:process";
import {
  archiveMemory,
  buildContext,
  doctor,
  initMemoryRoot,
  listMemories,
  readMemory,
  rebuildIndexes,
  searchMemories,
  writeMemory,
  type MemoryScope,
  type MemoryType
} from "@memorail/core";

type Flags = Record<string, string | boolean>;

const DEFAULT_ROOT = ".memorail";

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  const { args, flags } = parseArgs(rest);
  const root = String(flags.root ?? process.env.MEMORAIL_ROOT ?? DEFAULT_ROOT);

  switch (command) {
    case "init":
      await initMemoryRoot(root);
      printJson({ ok: true, root });
      return;
    case "write":
      await write(root, flags);
      return;
    case "list":
      printJson(await listMemories(root));
      return;
    case "search":
      await search(root, args, flags);
      return;
    case "read":
      await read(root, args);
      return;
    case "context":
      await context(root, args, flags);
      return;
    case "archive":
      await archive(root, args, flags);
      return;
    case "doctor":
      printJson(await doctor(root));
      return;
    case "rebuild-index":
      printJson(await rebuildIndexes(root));
      return;
    case "mcp":
      printJson({
        ok: true,
        command: "pnpm --filter @memorail/mcp-server start",
        note: "Use @memorail/mcp-server for stdio MCP."
      });
      return;
    case "help":
    case undefined:
      printHelp();
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

async function write(root: string, flags: Flags): Promise<void> {
  const type = required(flags.type, "type") as MemoryType;
  const scope = required(flags.scope, "scope") as MemoryScope;
  const summary = required(flags.summary, "summary");
  const body = required(flags.body, "body");
  const record = await writeMemory(root, {
    type,
    scope,
    summary,
    body,
    origin: (flags.origin as "manual" | "extract" | "dream" | "adapter" | "import") ?? "manual",
    source_ref: String(flags["source-ref"] ?? flags.source_ref ?? "cli"),
    confidence: optionalString(flags.confidence) as "low" | "medium" | "high" | undefined,
    agent: optionalString(flags.agent),
    project: optionalString(flags.project),
    session: optionalString(flags.session),
    supersedes: optionalString(flags.supersedes),
    slug: optionalString(flags.slug)
  });
  printJson(record);
}

async function search(root: string, args: string[], flags: Flags): Promise<void> {
  const query = args.join(" ").trim() || required(flags.query, "query");
  printJson(await searchMemories(root, query, {
    limit: optionalNumber(flags.limit),
    scope: optionalString(flags.scope) as MemoryScope | undefined,
    project: optionalString(flags.project)
  }));
}

async function read(root: string, args: string[]): Promise<void> {
  const target = args[0];
  if (!target) throw new Error("read requires a memory path.");
  printJson(await readMemory(root, target));
}

async function context(root: string, args: string[], flags: Flags): Promise<void> {
  const query = args.join(" ").trim() || required(flags.query, "query");
  printJson(await buildContext({
    root,
    query,
    limit: optionalNumber(flags.limit),
    scope: optionalString(flags.scope) as MemoryScope | undefined,
    project: optionalString(flags.project)
  }));
}

async function archive(root: string, args: string[], flags: Flags): Promise<void> {
  const target = args[0];
  if (!target) throw new Error("archive requires a memory path.");
  printJson(await archiveMemory(root, target, String(flags.reason ?? "cli")));
}

function parseArgs(values: string[]): { args: string[]; flags: Flags } {
  const args: string[] = [];
  const flags: Flags = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      args.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = values[index + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return { args, flags };
}

function required(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Missing required --${name}`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === true) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number: ${value}`);
  return parsed;
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printHelp(): void {
  process.stdout.write(`MemoRail CLI

Usage:
  memorail init [--root .memorail]
  memorail write --type preference --scope user --summary "..." --body "..."
  memorail list [--root .memorail]
  memorail search "query" [--limit 8]
  memorail read preference/example.md
  memorail context "query"
  memorail archive preference/example.md
  memorail doctor
  memorail rebuild-index
`);
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
