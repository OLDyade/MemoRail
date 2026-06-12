import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("dist/index.js");

async function withRoot(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "memorail-cli-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("CLI runs init write search context doctor round trip", async () => {
  await withRoot(async (root) => {
    await execFileAsync(process.execPath, [cliPath, "init", "--root", root]);
    await execFileAsync(process.execPath, [
      cliPath,
      "write",
      "--root",
      root,
      "--type",
      "preference",
      "--scope",
      "user",
      "--summary",
      "User prefers concise tables",
      "--body",
      "The user prefers concise tables."
    ]);

    const search = await execFileAsync(process.execPath, [cliPath, "search", "--root", root, "tables"]);
    const results = JSON.parse(search.stdout) as Array<{ summary: string }>;
    assert.equal(results[0]?.summary, "User prefers concise tables");

    const context = await execFileAsync(process.execPath, [cliPath, "context", "--root", root, "tables"]);
    assert.match(context.stdout, /Relevant MemoRail memories/);

    const doctor = await execFileAsync(process.execPath, [cliPath, "doctor", "--root", root]);
    assert.deepEqual(JSON.parse(doctor.stdout), []);

    const audit = await readFile(path.join(root, "audit.log.jsonl"), "utf8");
    assert.match(audit, /"action":"write"/);
  });
});
