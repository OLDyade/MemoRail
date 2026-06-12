import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  archiveMemory,
  buildContext,
  doctor,
  initMemoryRoot,
  parseMemoryDocument,
  readMemory,
  rebuildIndexes,
  searchMemories,
  writeMemory
} from "./index.js";

async function withRoot(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "memorail-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("writes markdown memory and rebuilds derived indexes", async () => {
  await withRoot(async (root) => {
    await initMemoryRoot(root);
    const record = await writeMemory(root, {
      type: "preference",
      scope: "user",
      summary: "User prefers direct Chinese answers",
      body: "The user prefers direct Chinese answers with tables when comparing options.",
      origin: "manual",
      source_ref: "test"
    });

    assert.equal(record.status, "active");
    assert.match(record.path, /^preference\//);

    const manifest = JSON.parse(await readFile(path.join(root, "memory.json"), "utf8"));
    assert.equal(manifest.memories.length, 1);
    assert.equal(manifest.memories[0].summary, "User prefers direct Chinese answers");

    const index = await readFile(path.join(root, "MEMORY.md"), "utf8");
    assert.match(index, /direct Chinese/);

    const entities = JSON.parse(await readFile(path.join(root, "entities.json"), "utf8"));
    assert.ok(entities.chinese);
  });
});

test("searches and builds a context prelude from memory", async () => {
  await withRoot(async (root) => {
    await initMemoryRoot(root);
    await writeMemory(root, {
      type: "context",
      scope: "project",
      summary: "OpenClaw uses native lifecycle hooks",
      body: "OpenClaw integrations should use before_agent_start and agent_end hooks for context and extraction.",
      origin: "manual",
      source_ref: "test",
      project: "memorail"
    });

    const results = await searchMemories(root, "OpenClaw hooks", { project: "memorail" });
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "context");

    const context = await buildContext({ root, query: "How should OpenClaw connect?", project: "memorail" });
    assert.match(context.preludePrompt, /OpenClaw/);
    assert.match(context.systemPrompt, /MemoRail/);
  });
});

test("rejects unsafe paths and invalid frontmatter", async () => {
  assert.throws(() => {
    parseMemoryDocument("---\ntype: nope\n---\nbody", "context/bad.md");
  }, /Missing required field: scope|Invalid type/);

  await withRoot(async (root) => {
    await initMemoryRoot(root);
    await assert.rejects(readMemory(root, "../outside.md"), /must not contain/);
  });
});

test("archives memory and excludes it from search", async () => {
  await withRoot(async (root) => {
    await initMemoryRoot(root);
    const record = await writeMemory(root, {
      type: "style",
      scope: "user",
      summary: "Use concise tables",
      body: "The user prefers concise tables.",
      origin: "manual",
      source_ref: "test"
    });

    await archiveMemory(root, record.path, "test");
    const results = await searchMemories(root, "tables");
    assert.equal(results.length, 0);
  });
});

test("doctor reports missing derived indexes", async () => {
  await withRoot(async (root) => {
    await initMemoryRoot(root);
    await writeMemory(root, {
      type: "workflow",
      scope: "project",
      summary: "Run doctor before release",
      body: "Run doctor before release.",
      origin: "manual",
      source_ref: "test"
    });
    await rm(path.join(root, "bm25.json"));
    const findings = await doctor(root);
    assert.equal(findings.some((finding) => finding.code === "missing-index"), true);
    await rebuildIndexes(root);
    assert.equal((await doctor(root)).some((finding) => finding.severity === "error"), false);
  });
});
