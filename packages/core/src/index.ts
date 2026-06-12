export const MEMORY_TYPES = [
  "identity",
  "preference",
  "style",
  "workflow",
  "context",
  "ambient"
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

export type MemoryRecord = {
  name: string;
  description: string;
  type: MemoryType;
  scope?: "user" | "project" | "workspace" | "team";
  confidence?: "low" | "medium" | "high";
  createdAt?: string;
  updatedAt?: string;
  body?: string;
};

export type BuildContextInput = {
  query: string;
  limit?: number;
};

export type BuildContextResult = {
  systemPrompt: string;
  preludePrompt: string;
};

export function createMemory() {
  throw new Error("MemoRail core is not implemented yet.");
}

