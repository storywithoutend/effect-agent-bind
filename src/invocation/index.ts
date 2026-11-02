import type {
  AgentId,
  InvocationPlan,
  InvocationRequest,
  ResolvedAgent,
} from "../catalog/index.js";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1_000;

export class InvocationPlanError extends Error {
  readonly _tag = "InvocationPlanError";

  constructor(
    readonly code: "unsupported_policy" | "invalid_request",
    message: string,
  ) {
    super(message);
  }
}

const modelArgs = (
  flag: string,
  model: string | undefined,
): readonly string[] => (model ? [flag, model] : []);

const basePlan = (
  agent: ResolvedAgent,
  request: InvocationRequest,
  args: readonly string[],
  permissionMode: string,
  env: Readonly<Record<string, string>> = {},
): InvocationPlan => ({
  agentId: agent.id,
  command: agent.binary,
  args,
  cwd: request.cwd,
  env: { ...request.env, ...env },
  model: request.model ?? "default",
  timeoutMs: request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  outputFormat: "jsonl",
  session: request.session,
  userConfig: request.userConfig,
  permissionMode,
});

const claudePlan = (
  agent: ResolvedAgent,
  request: InvocationRequest,
): InvocationPlan => {
  const tools = request.tools === "full"
    ? "Read,Glob,Grep,Write,Edit,Bash"
    : "Read,Glob,Grep,Write,Edit"
  return basePlan(
    agent,
    request,
    [
      "-p",
      request.prompt,
      "--output-format",
      "stream-json",
      "--verbose",
      "--permission-mode",
      "dontAsk",
      "--permission-prompts",
      "none",
      "--safe-mode",
      "--setting-sources",
      "",
      "--strict-mcp-config",
      "--disable-slash-commands",
      "--tools",
      tools,
      "--allowedTools",
      tools,
      ...(request.session === "ephemeral"
        ? ["--no-session-persistence"]
        : []),
      ...modelArgs("--model", request.model),
    ],
    "dontAsk-allowedTools",
  );
}

const codexPlan = (
  agent: ResolvedAgent,
  request: InvocationRequest,
): InvocationPlan =>
  basePlan(
    agent,
    request,
    [
      "exec",
      "--json",
      ...(request.session === "ephemeral" ? ["--ephemeral"] : []),
      "--skip-git-repo-check",
      "--ignore-user-config",
      "--ignore-rules",
      "-c",
      'approval_policy="never"',
      "--sandbox",
      "danger-full-access",
      "-C",
      request.cwd,
      ...modelArgs("--model", request.model),
      request.prompt,
    ],
    "never-danger-full-access",
  );

const piPlan = (
  agent: ResolvedAgent,
  request: InvocationRequest,
): InvocationPlan => {
  const tools = request.tools === "full"
    ? "read,bash,edit,write,grep,find,ls"
    : "read,edit,write,grep,find,ls"
  return basePlan(
    agent,
    request,
    [
      "--print",
      "--mode",
      "json",
      ...(request.session === "ephemeral" ? ["--no-session"] : []),
      "--no-extensions",
      "--no-mcp",
      "--no-skills",
      "--no-prompt-templates",
      "--no-themes",
      "--no-context-files",
      "--no-approve",
      "--tools",
      tools,
      ...modelArgs("--provider", request.provider),
      ...modelArgs("--model", request.model),
      "--",
      request.prompt,
    ],
    "built-in-tools",
  );
}

const geminiPlan = (
  agent: ResolvedAgent,
  request: InvocationRequest,
): InvocationPlan =>
  basePlan(
    agent,
    request,
    [
      "--prompt",
      request.prompt,
      "--output-format",
      "stream-json",
      "--skip-trust",
      "--approval-mode",
      "auto_edit",
      ...modelArgs("--model", request.model),
    ],
    "auto-edit",
  );

const grokPlan = (
  agent: ResolvedAgent,
  request: InvocationRequest,
): InvocationPlan =>
  basePlan(
    agent,
    request,
    [
      "--cwd",
      request.cwd,
      "--single",
      request.prompt,
      "--output-format",
      "streaming-json",
      "--permission-mode",
      "dontAsk",
      "--disable-web-search",
      "--no-subagents",
      "--no-memory",
      "--no-leader",
      "--no-auto-update",
      "--tools",
      "read,grep,edit,bash",
      ...modelArgs("--model", request.model),
    ],
    "dontAsk",
  );

type PlanBuilder = (
  agent: ResolvedAgent,
  request: InvocationRequest,
) => InvocationPlan;

const PLAN_BUILDERS: Partial<Record<AgentId, PlanBuilder>> = {
  claude: claudePlan,
  codex: codexPlan,
  pi: piPlan,
  gemini: geminiPlan,
  grok: grokPlan,
};

export const createInvocationPlan = (
  agent: ResolvedAgent,
  request: InvocationRequest,
): InvocationPlan => {
  if (!request.prompt.trim()) {
    throw new InvocationPlanError("invalid_request", "prompt must not be empty");
  }
  if (!request.cwd) {
    throw new InvocationPlanError("invalid_request", "cwd must not be empty");
  }
  if (request.userConfig === "inherit") {
    throw new InvocationPlanError(
      "unsupported_policy",
      "inherited user configuration can add tools, hooks, or execution rules",
    );
  }
  if (request.tools === "files" && agent.id !== "claude" && agent.id !== "pi") {
    throw new InvocationPlanError(
      "unsupported_policy",
      `${agent.id} cannot disable process tools for the file-only profile`,
    );
  }
  const build = PLAN_BUILDERS[agent.id];
  if (!build) {
    throw new InvocationPlanError(
      "unsupported_policy",
      `${agent.id} has no unattended invocation without a blanket approval flag`,
    );
  }
  return build(agent, request);
};
