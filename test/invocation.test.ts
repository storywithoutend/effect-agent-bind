import { describe, expect, it } from "vitest";
import {
  InvocationPlanError,
  createInvocationPlan,
} from "../src/invocation/index.js";
import type {
  InvocationRequest,
  ResolvedAgent,
} from "../src/catalog/index.js";

const agent = (id: ResolvedAgent["id"]): ResolvedAgent => ({
  id,
  binary: `/bin/${id}`,
});

const request = (
  overrides: Partial<InvocationRequest> = {},
): InvocationRequest => ({
  prompt: "inspect the captures",
  cwd: "/workspace/eval",
  env: { EVAL_RUN: "1" },
  model: "test-model",
  provider: "anthropic",
  timeoutMs: 1_000,
  session: "ephemeral",
  userConfig: "auth-only",
  permissionMode: "unattended",
  tools: "full",
  ...overrides,
});

const commandLine = (plan: ReturnType<typeof createInvocationPlan>): string =>
  [plan.command, ...plan.args].join(" ");

const SUPPORTED_INVOCATION_IDS = [
  "claude",
  "codex",
  "pi",
  "gemini",
  "grok",
] satisfies readonly ResolvedAgent["id"][];

describe("createInvocationPlan", () => {
  it.each(SUPPORTED_INVOCATION_IDS)(
    "creates a plain structured invocation for %s",
    (id) => {
      const plan = createInvocationPlan(agent(id), request());

      expect(plan).toMatchObject({
        agentId: id,
        cwd: "/workspace/eval",
        env: { EVAL_RUN: "1" },
        model: "test-model",
        outputFormat: "jsonl",
        session: "ephemeral",
        userConfig: "auth-only",
      });
      expect(plan).not.toHaveProperty("files");
      expect(plan).not.toHaveProperty("isolation");
      expect(plan).not.toHaveProperty("permission.blanketBypass");
      expect(commandLine(plan)).not.toMatch(
        /dangerously-bypass|dangerously-skip|bypassPermissions|always-approve|--force|--yolo(?:\s|$)/,
      );
    },
  );

  it("uses Claude unattended permissions without a generated sandbox", () => {
    const plan = createInvocationPlan(agent("claude"), request());

    expect(plan.permissionMode).toBe("dontAsk-allowedTools");
    expect(plan.args).toContain("dontAsk");
    expect(plan.args.join(" ")).toContain("Read,Glob,Grep,Write,Edit,Bash");
    expect(plan.args).not.toContain("--restricted");
    expect(plan.args).not.toContain("--settings");
  });

  it("disables the Codex inner sandbox without using its blanket bypass flag", () => {
    const plan = createInvocationPlan(agent("codex"), request());

    expect(plan.permissionMode).toBe("never-danger-full-access");
    expect(plan.args).toContain("danger-full-access");
    expect(plan.args).toContain('approval_policy="never"');
    expect(plan.args).not.toContain("--dangerously-bypass-approvals-and-sandbox");
  });

  it("uses Pi built-in tools without a generated extension", () => {
    const plan = createInvocationPlan(agent("pi"), request());

    expect(plan.permissionMode).toBe("built-in-tools");
    expect(plan.args).toContain("read,bash,edit,write,grep,find,ls");
    expect(plan.args).toContain("--provider");
    expect(plan.args).toContain("anthropic");
    expect(plan.args).not.toContain("--no-builtin-tools");
    expect(plan.args).not.toContain("--extension");
    expect(plan.args).not.toContain("--offline");
  });

  it.each(["claude", "pi"] as const)("removes shell tools from the %s file-only profile", (id) => {
    const plan = createInvocationPlan(agent(id), request({ tools: "files" }))

    expect(commandLine(plan)).not.toMatch(/(?:^|,)Bash(?:,|$)|(?:^|,)bash(?:,|$)/)
  })

  it("fails closed when Codex cannot provide a file-only tool profile", () => {
    expect(() => createInvocationPlan(agent("codex"), request({ tools: "files" }))).toThrow(InvocationPlanError)
  })

  it("fails closed instead of inheriting user execution configuration", () => {
    expect(() =>
      createInvocationPlan(
        agent("claude"),
        request({ userConfig: "inherit" }),
      ),
    ).toThrow(InvocationPlanError);
  });

  it("refuses Cursor unattended writes because they require --force", () => {
    expect(() => createInvocationPlan(agent("cursor"), request())).toThrow(
      InvocationPlanError,
    );
  });
});
