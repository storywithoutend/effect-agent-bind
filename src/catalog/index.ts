import type { AgentCatalogEntry, AgentId } from "./types.js";

export const CATALOG: readonly AgentCatalogEntry[] = [
  {
    id: "claude",
    binaries: ["claude"],
    notes: "Claude Code headless mode with stream JSON output.",
  },
  {
    id: "codex",
    binaries: ["codex"],
    notes: "Codex exec with JSONL output.",
  },
  {
    id: "pi",
    binaries: ["pi"],
    notes: "Pi print mode with explicit built-in tools.",
  },
  {
    id: "gemini",
    binaries: ["gemini"],
    notes: "Gemini headless mode with stream JSON output.",
  },
  {
    id: "cursor",
    binaries: ["cursor-agent"],
    notes: "Cursor Agent is cataloged but has no unattended write plan.",
  },
  {
    id: "grok",
    binaries: ["grok"],
    notes: "Grok Build headless mode with stream JSON output.",
  },
];

export const catalogById = (id: string): AgentCatalogEntry | undefined =>
  CATALOG.find((entry) => entry.id === id);

export const isAgentId = (id: string): id is AgentId =>
  CATALOG.some((entry) => entry.id === id);

export type {
  AgentCatalogEntry,
  AgentId,
  AgentSelection,
  InvocationPlan,
  InvocationRequest,
  NormalizedUsage,
  ProbeCommand,
  ProbeCommandResult,
  ProbeExecutor,
  ProbeHit,
  ResolvedAgent,
} from "./types.js";
