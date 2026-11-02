#!/usr/bin/env node
import { cwd } from "node:process";
import {
  isAgentId,
  type AgentId,
  type AgentSelection,
  type InvocationRequest,
} from "../catalog/index.js";
import {
  createInvocationPlan,
  InvocationPlanError,
} from "../invocation/index.js";
import { probeInstalledAgents } from "../probe/index.js";
import { selectAgent, SelectionError } from "../resolve/index.js";

const args = process.argv.slice(2);
const command = args[0];

const printJson = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

const usage = (): void => {
  process.stderr.write(`usage:
  effect-agent-bind probe [--json]
  effect-agent-bind resolve --id <agentId|auto> [--prefer <ids>] [--json]
  effect-agent-bind plan --id <agentId|auto> --prompt <text> [options] [--json]

options:
  --cwd <directory>
  --model <model-id>
  --provider <provider-id>
  --prefer <comma-separated-agent-ids>
`);
};

const flag = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const parseAgentIds = (value: string | undefined): readonly AgentId[] => {
  if (!value) return [];
  return value.split(",").flatMap((entry) => {
    const id = entry.trim();
    if (!isAgentId(id)) {
      throw new SelectionError("not_found", `unknown agent id '${id}'`);
    }
    return [id];
  });
};

const selection = (): AgentSelection => {
  const id = flag("--id");
  if (!id) throw new SelectionError("not_found", "--id is required");
  if (id === "auto") {
    const preference = parseAgentIds(flag("--prefer"));
    return preference.length > 0
      ? { kind: "auto", preference }
      : { kind: "auto" };
  }
  if (!isAgentId(id)) {
    throw new SelectionError("not_found", `unknown agent id '${id}'`);
  }
  return { kind: "explicit", id };
};

const invocationRequest = (): InvocationRequest => {
  const prompt = flag("--prompt");
  if (prompt === undefined) {
    throw new InvocationPlanError("invalid_request", "--prompt is required");
  }
  return {
    prompt,
    cwd: flag("--cwd") ?? cwd(),
    model: flag("--model"),
    provider: flag("--provider"),
    session: "ephemeral",
    userConfig: "auth-only",
    permissionMode: "unattended",
    tools: "full",
  };
};

const main = async (): Promise<void> => {
  const wantJson = args.includes("--json");
  if (command === "probe") {
    const agents = await probeInstalledAgents();
    if (wantJson) printJson({ ok: true, agents });
    else {
      for (const agent of agents) {
        process.stdout.write(
          `${agent.id}\t${agent.binary}\t${agent.versionLine ?? ""}\n`,
        );
      }
      if (agents.length === 0) process.stdout.write("(none)\n");
    }
    return;
  }

  if (["resolve", "plan"].includes(command ?? "")) {
    const agents = await probeInstalledAgents();
    const resolved = selectAgent(selection(), agents);
    if (command === "resolve") {
      if (wantJson) printJson({ ok: true, agent: resolved });
      else process.stdout.write(`${resolved.id}\t${resolved.binary}\n`);
      return;
    }
    const plan = createInvocationPlan(resolved, invocationRequest());
    if (wantJson) printJson({ ok: true, plan });
    else process.stdout.write(`${plan.command} ${plan.args.join(" ")}\n`);
    return;
  }

  usage();
  process.exitCode = 2;
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (args.includes("--json")) printJson({ ok: false, error: message });
  else process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
