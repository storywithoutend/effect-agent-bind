export type AgentId =
  | "claude"
  | "codex"
  | "pi"
  | "gemini"
  | "cursor"
  | "grok";

export type AgentCatalogEntry = {
  readonly id: AgentId;
  readonly binaries: readonly string[];
  readonly notes: string;
};

export type ProbeHit = {
  readonly id: AgentId;
  readonly binary: string;
  readonly versionLine?: string;
};

export type ProbeCommand = {
  readonly command: string;
  readonly args: readonly string[];
  readonly timeoutMs: number;
};

export type ProbeCommandResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

export type ProbeExecutor = (
  input: ProbeCommand,
) => Promise<ProbeCommandResult>;

export type ResolvedAgent = {
  readonly id: AgentId;
  readonly binary: string;
};

export type AgentSelection =
  | {
      readonly kind: "explicit";
      readonly id: AgentId;
    }
  | {
      readonly kind: "auto";
      readonly preference?: readonly AgentId[];
    };

export type InvocationRequest = {
  readonly prompt: string;
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly model?: string;
  readonly provider?: string;
  readonly timeoutMs?: number;
  readonly session: "ephemeral" | "persistent";
  readonly userConfig: "auth-only" | "inherit";
  readonly permissionMode: "unattended";
  readonly tools: "files" | "full";
};

export type InvocationPlan = {
  readonly agentId: AgentId;
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly model: string;
  readonly timeoutMs: number;
  readonly outputFormat: "jsonl";
  readonly session: "ephemeral" | "persistent";
  readonly userConfig: "auth-only" | "inherit";
  readonly permissionMode: string;
};

export type NormalizedUsage = {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalCostUsd: number;
  readonly wallClockSeconds: number;
  readonly turnCount: number;
  readonly commandCount: number;
  readonly outputBytes: number;
};
