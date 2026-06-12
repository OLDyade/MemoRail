import { promises as fs } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

export const MEMORY_TYPES = [
  "identity",
  "preference",
  "style",
  "workflow",
  "context",
  "ambient"
] as const;

export const MEMORY_SCOPES = ["user", "project", "workspace"] as const;
export const MEMORY_STATUSES = ["active", "archived", "conflict"] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];
export type MemoryScope = (typeof MEMORY_SCOPES)[number];
export type MemoryStatus = (typeof MEMORY_STATUSES)[number];

export type MemoryFrontmatter = {
  type: MemoryType;
  scope: MemoryScope;
  summary: string;
  origin: "manual" | "extract" | "dream" | "adapter" | "import";
  source_ref: string;
  created_at: string;
  updated_at: string;
  confidence?: "low" | "medium" | "high";
  status?: MemoryStatus;
  agent?: string;
  project?: string;
  session?: string;
  supersedes?: string;
};

export type MemoryRecord = MemoryFrontmatter & {
  path: string;
  body: string;
};

export type MemoryCandidate = {
  type: MemoryType;
  scope: MemoryScope;
  summary: string;
  body: string;
  origin?: MemoryFrontmatter["origin"];
  source_ref?: string;
  confidence?: MemoryFrontmatter["confidence"];
  status?: MemoryStatus;
  agent?: string;
  project?: string;
  session?: string;
  supersedes?: string;
  slug?: string;
};

export type BuildContextInput = {
  root: string;
  query: string;
  limit?: number;
  scope?: MemoryScope;
  project?: string;
};

export type BuildContextResult = {
  systemPrompt: string;
  preludePrompt: string;
  memories: SearchResult[];
};

export type SearchResult = {
  path: string;
  summary: string;
  type: MemoryType;
  scope: MemoryScope;
  status: MemoryStatus;
  score: number;
  updated_at: string;
};

export type Manifest = {
  version: 1;
  generated_at: string;
  memories: Array<Omit<MemoryRecord, "body">>;
};

export type DoctorFinding = {
  severity: "error" | "warn" | "info";
  code: string;
  path?: string;
  message: string;
};

const SKIP_FILES = new Set([
  "MEMORY.md",
  "memory.json",
  "entities.json",
  "bm25.json",
  "audit.log.jsonl",
  ".memorail.lock"
]);

const ROOT_FILES = {
  index: "MEMORY.md",
  manifest: "memory.json",
  entities: "entities.json",
  bm25: "bm25.json",
  audit: "audit.log.jsonl",
  lock: ".memorail.lock"
} as const;

export async function initMemoryRoot(root: string): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  await Promise.all(MEMORY_TYPES.map((type) => fs.mkdir(path.join(root, type), { recursive: true })));
  await rebuildIndexes(root);
}

export async function writeMemory(root: string, candidate: MemoryCandidate): Promise<MemoryRecord> {
  return withMemoryLock(root, async () => {
    await fs.mkdir(root, { recursive: true });
    const now = new Date().toISOString();
    const frontmatter: MemoryFrontmatter = validateFrontmatter({
      type: candidate.type,
      scope: candidate.scope,
      summary: candidate.summary,
      origin: candidate.origin ?? "manual",
      source_ref: candidate.source_ref ?? "manual",
      created_at: now,
      updated_at: now,
      confidence: candidate.confidence,
      status: candidate.status ?? "active",
      agent: candidate.agent,
      project: candidate.project,
      session: candidate.session,
      supersedes: candidate.supersedes
    });

    const relativePath = await nextMemoryPath(root, frontmatter.type, candidate.slug ?? candidate.summary);
    const record: MemoryRecord = {
      ...frontmatter,
      path: relativePath,
      body: normalizeBody(candidate.body)
    };

    await assertSafeMemoryPath(root, relativePath);
    await atomicWrite(path.join(root, relativePath), serializeMemory(record));
    await appendAudit(root, {
      action: "write",
      path: relativePath,
      source: frontmatter.origin,
      summary: frontmatter.summary,
      result: "ok"
    });
    await rebuildIndexes(root);
    return record;
  });
}

export async function readMemory(root: string, relativePath: string): Promise<MemoryRecord> {
  await assertSafeMemoryPath(root, relativePath);
  const content = await fs.readFile(path.join(root, relativePath), "utf8");
  return parseMemoryDocument(content, relativePath);
}

export async function listMemories(root: string): Promise<MemoryRecord[]> {
  const paths = await listMemoryPaths(root);
  const records = await Promise.all(paths.map((filePath) => readMemory(root, filePath)));
  return records.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

export async function searchMemories(
  root: string,
  query: string,
  options: { limit?: number; scope?: MemoryScope; project?: string } = {}
): Promise<SearchResult[]> {
  const limit = Math.max(1, options.limit ?? 8);
  const terms = tokenize(query);
  const records = await listMemories(root);
  const candidates = records
    .filter((record) => record.status !== "archived")
    .filter((record) => !options.scope || record.scope === options.scope)
    .filter((record) => !options.project || !record.project || record.project === options.project)
    .map((record) => {
      const haystack = `${record.summary}\n${record.body}\n${record.type}\n${record.scope}\n${record.agent ?? ""}\n${record.project ?? ""}`;
      const score = scoreText(haystack, terms);
      return toSearchResult(record, score);
    })
    .filter((result) => result.score > 0 || terms.length === 0)
    .sort((left, right) => right.score - left.score || right.updated_at.localeCompare(left.updated_at));

  return candidates.slice(0, limit);
}

export async function buildContext(input: BuildContextInput): Promise<BuildContextResult> {
  const memories = await searchMemories(input.root, input.query, {
    limit: input.limit ?? 6,
    scope: input.scope,
    project: input.project
  });
  const systemPrompt = [
    "You have access to MemoRail long-term memory.",
    "Use memory only when it is relevant to the current task.",
    "Treat stale or conflict memories as hints, not confirmed facts.",
    "Do not mention memory files, paths, or internal indexing to the user."
  ].join("\n");
  const body = memories.length === 0
    ? "No relevant memories were found."
    : memories.map((memory) => (
      `- ${memory.summary} (type: ${memory.type}, scope: ${memory.scope}, status: ${memory.status}, path: ${memory.path})`
    )).join("\n");
  return {
    systemPrompt,
    preludePrompt: `<system-reminder>\n## Relevant MemoRail memories\n\n${body}\n</system-reminder>`,
    memories
  };
}

export async function archiveMemory(root: string, relativePath: string, reason = "archive"): Promise<MemoryRecord> {
  return withMemoryLock(root, async () => {
    const record = await readMemory(root, relativePath);
    const next: MemoryRecord = {
      ...record,
      status: "archived",
      updated_at: new Date().toISOString()
    };
    await atomicWrite(path.join(root, relativePath), serializeMemory(next));
    await appendAudit(root, {
      action: "archive",
      path: relativePath,
      source: reason,
      summary: record.summary,
      result: "ok"
    });
    await rebuildIndexes(root);
    return next;
  });
}

export async function rebuildIndexes(root: string): Promise<Manifest> {
  await fs.mkdir(root, { recursive: true });
  const records = await listMemories(root).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const generated_at = new Date().toISOString();
  const manifest: Manifest = {
    version: 1,
    generated_at,
    memories: records.map(({ body: _body, ...frontmatter }) => frontmatter)
  };

  await atomicWrite(path.join(root, ROOT_FILES.manifest), `${JSON.stringify(manifest, null, 2)}\n`);
  await atomicWrite(path.join(root, ROOT_FILES.index), formatMemoryIndex(records));
  await atomicWrite(path.join(root, ROOT_FILES.entities), `${JSON.stringify(buildEntityIndex(records), null, 2)}\n`);
  await atomicWrite(path.join(root, ROOT_FILES.bm25), `${JSON.stringify(buildLexicalIndex(records), null, 2)}\n`);
  return manifest;
}

export async function doctor(root: string): Promise<DoctorFinding[]> {
  const findings: DoctorFinding[] = [];
  const paths = await listMemoryPaths(root).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      findings.push({
        severity: "error",
        code: "missing-root",
        message: `Memory root does not exist: ${root}`
      });
      return [];
    }
    throw error;
  });

  for (const relativePath of paths) {
    try {
      const record = await readMemory(root, relativePath);
      if (!relativePath.startsWith(`${record.type}/`)) {
        findings.push({
          severity: "error",
          code: "path-type-mismatch",
          path: relativePath,
          message: `Path must live under ${record.type}/.`
        });
      }
    } catch (error) {
      findings.push({
        severity: "error",
        code: "invalid-memory",
        path: relativePath,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  for (const fileName of [ROOT_FILES.index, ROOT_FILES.manifest, ROOT_FILES.entities, ROOT_FILES.bm25]) {
    try {
      await fs.access(path.join(root, fileName));
    } catch {
      findings.push({
        severity: "warn",
        code: "missing-index",
        path: fileName,
        message: `${fileName} is missing; run rebuild-index.`
      });
    }
  }

  const lockPath = path.join(root, ROOT_FILES.lock);
  try {
    const lock = JSON.parse(await fs.readFile(lockPath, "utf8")) as { created_at?: string };
    const age = Date.now() - new Date(lock.created_at ?? 0).getTime();
    if (Number.isFinite(age) && age > 120_000) {
      findings.push({
        severity: "warn",
        code: "stale-lock",
        path: ROOT_FILES.lock,
        message: "A write lock appears stale."
      });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  return findings;
}

export function parseMemoryDocument(content: string, relativePath: string): MemoryRecord {
  const normalized = content.replace(/\r\n?/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Memory file is missing YAML frontmatter: ${relativePath}`);
  const frontmatter = validateFrontmatter(parseFrontmatter(match[1]));
  return {
    ...frontmatter,
    path: normalizeRelativePath(relativePath),
    body: match[2].trim()
  };
}

export function serializeMemory(record: MemoryRecord): string {
  const frontmatter = {
    type: record.type,
    scope: record.scope,
    summary: record.summary,
    origin: record.origin,
    source_ref: record.source_ref,
    created_at: record.created_at,
    updated_at: record.updated_at,
    confidence: record.confidence,
    status: record.status ?? "active",
    agent: record.agent,
    project: record.project,
    session: record.session,
    supersedes: record.supersedes
  };
  const lines = Object.entries(frontmatter)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${String(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n${normalizeBody(record.body)}\n`;
}

async function listMemoryPaths(root: string): Promise<string[]> {
  const result: string[] = [];
  await walk(root, root, result);
  return result.sort((left, right) => left.localeCompare(right));
}

async function walk(root: string, current: string, result: string[]): Promise<void> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await walk(root, absolute, result);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md") || SKIP_FILES.has(entry.name)) continue;
    result.push(normalizeRelativePath(path.relative(root, absolute)));
  }
}

function parseFrontmatter(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const index = line.indexOf(":");
    if (index === -1) throw new Error(`Invalid frontmatter line: ${line}`);
    result[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return result;
}

function validateFrontmatter(value: Record<string, unknown>): MemoryFrontmatter {
  const type = requireOneOf(value.type, MEMORY_TYPES, "type");
  const scope = requireOneOf(value.scope, MEMORY_SCOPES, "scope");
  const status = optionalOneOf(value.status, MEMORY_STATUSES, "status") ?? "active";
  const summary = requireString(value.summary, "summary");
  const origin = requireOneOf(value.origin, ["manual", "extract", "dream", "adapter", "import"] as const, "origin");
  const source_ref = requireString(value.source_ref, "source_ref");
  const created_at = requireIsoDate(value.created_at, "created_at");
  const updated_at = requireIsoDate(value.updated_at, "updated_at");
  const confidence = optionalOneOf(value.confidence, ["low", "medium", "high"] as const, "confidence");
  return {
    type,
    scope,
    summary,
    origin,
    source_ref,
    created_at,
    updated_at,
    confidence,
    status,
    agent: optionalString(value.agent),
    project: optionalString(value.project),
    session: optionalString(value.session),
    supersedes: optionalString(value.supersedes)
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Missing required field: ${field}`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error("Optional fields must be strings.");
  return value.trim();
}

function requireIsoDate(value: unknown, field: string): string {
  const text = requireString(value, field);
  if (!Number.isFinite(new Date(text).getTime())) throw new Error(`Invalid ISO date field: ${field}`);
  return text;
}

function requireOneOf<T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] {
  const text = requireString(value, field);
  if (!allowed.includes(text)) throw new Error(`Invalid ${field}: ${text}`);
  return text as T[number];
}

function optionalOneOf<T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireOneOf(value, allowed, field);
}

async function nextMemoryPath(root: string, type: MemoryType, source: string): Promise<string> {
  const base = slugify(source);
  for (let index = 0; index < 1000; index += 1) {
    const fileName = index === 0 ? `${base}.md` : `${base}-${index + 1}.md`;
    const relativePath = `${type}/${fileName}`;
    try {
      await fs.access(path.join(root, relativePath));
    } catch {
      return relativePath;
    }
  }
  throw new Error(`Could not allocate memory path for ${source}`);
}

async function assertSafeMemoryPath(root: string, relativePath: string): Promise<void> {
  const normalized = normalizeRelativePath(relativePath);
  if (path.isAbsolute(normalized)) throw new Error("Memory path must be relative.");
  if (normalized.split("/").includes("..")) throw new Error("Memory path must not contain '..'.");
  if (!normalized.endsWith(".md")) throw new Error("Memory path must point to a markdown file.");
  const [directory] = normalized.split("/");
  if (!MEMORY_TYPES.includes(directory as MemoryType)) throw new Error("Memory path must live under a memory type directory.");
  const absoluteRoot = path.resolve(root);
  const absoluteTarget = path.resolve(root, normalized);
  if (!absoluteTarget.startsWith(`${absoluteRoot}${path.sep}`)) throw new Error("Memory path escapes memory root.");
  await fs.mkdir(path.dirname(absoluteTarget), { recursive: true });
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

function normalizeBody(value: string): string {
  const body = String(value ?? "").replace(/\r\n?/g, "\n").trim();
  if (!body) throw new Error("Memory body must not be empty.");
  return body;
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "memory";
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, content, "utf8");
  await fs.rename(tempPath, filePath);
}

async function withMemoryLock<T>(root: string, fn: () => Promise<T>): Promise<T> {
  await fs.mkdir(root, { recursive: true });
  const lockPath = path.join(root, ROOT_FILES.lock);
  let handle: FileHandle | undefined;
  try {
    handle = await fs.open(lockPath, "wx");
    await handle.writeFile(JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() }));
    return await fn();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`MemoRail memory root is locked: ${lockPath}`);
    }
    throw error;
  } finally {
    await handle?.close();
    if (handle) await fs.unlink(lockPath).catch(() => undefined);
  }
}

async function appendAudit(
  root: string,
  entry: { action: string; path: string; source: string; summary: string; result: "ok" | "failed" }
): Promise<void> {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry
  });
  await fs.appendFile(path.join(root, ROOT_FILES.audit), `${line}\n`, "utf8");
}

function formatMemoryIndex(records: MemoryRecord[]): string {
  if (records.length === 0) return "# MemoRail Memory Index\n\nNo memories yet.\n";
  const lines = ["# MemoRail Memory Index", ""];
  for (const record of records) {
    lines.push(`- [${record.summary}](${record.path}) - type: ${record.type}, scope: ${record.scope}, status: ${record.status ?? "active"}, updated: ${record.updated_at}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildEntityIndex(records: MemoryRecord[]): Record<string, string[]> {
  const index: Record<string, Set<string>> = {};
  for (const record of records) {
    for (const token of tokenize(`${record.summary} ${record.body} ${record.agent ?? ""} ${record.project ?? ""}`)) {
      if (token.length < 3) continue;
      index[token] ??= new Set<string>();
      index[token].add(record.path);
    }
  }
  return Object.fromEntries(
    Object.entries(index)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([entity, paths]) => [entity, [...paths].sort((left, right) => left.localeCompare(right))])
  );
}

function buildLexicalIndex(records: MemoryRecord[]): Record<string, Array<{ path: string; count: number }>> {
  const index = new Map<string, Map<string, number>>();
  for (const record of records) {
    for (const token of tokenize(`${record.summary} ${record.body}`)) {
      const entries = index.get(token) ?? new Map<string, number>();
      entries.set(record.path, (entries.get(record.path) ?? 0) + 1);
      index.set(token, entries);
    }
  }
  return Object.fromEntries(
    [...index.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([term, entries]) => [
      term,
      [...entries.entries()]
        .map(([entryPath, count]) => ({ path: entryPath, count }))
        .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path))
    ])
  );
}

function tokenize(value: string): string[] {
  return [...new Set(
    String(value)
      .toLowerCase()
      .match(/[a-z0-9_./-]{2,}|[\u4e00-\u9fa5]{2,}/g) ?? []
  )];
}

function scoreText(value: string, terms: string[]): number {
  const text = value.toLowerCase();
  return terms.reduce((score, term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(escaped, "g"))?.length ?? 0;
    return score + matches * (term.includes("/") || term.includes("-") ? 2 : 1);
  }, 0);
}

function toSearchResult(record: MemoryRecord, score: number): SearchResult {
  return {
    path: record.path,
    summary: record.summary,
    type: record.type,
    scope: record.scope,
    status: record.status ?? "active",
    score,
    updated_at: record.updated_at
  };
}
