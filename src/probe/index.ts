import { spawnSync } from "node:child_process";
import { Effect } from "effect";
import {
  CATALOG,
  type AgentId,
  type ProbeCommand,
  type ProbeCommandResult,
  type ProbeExecutor,
  type ProbeHit,
} from "../catalog/index.js";

export class ProbeError {
  readonly _tag = "ProbeError";
  constructor(readonly message: string) {}
}

const VERSION_ARGUMENTS: readonly (readonly string[])[] = [
  ["--version"],
  ["-V"],
  ["version"],
];

const firstLine = (value: string): string | undefined => {
  const line = value.trim().split("\n")[0]?.trim();
  return line || undefined;
};

const hostExecutor: ProbeExecutor = async (
  input: ProbeCommand,
): Promise<ProbeCommandResult> => {
  const result = spawnSync(input.command, [...input.args], {
    encoding: "utf8",
    timeout: input.timeoutMs,
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: [result.stderr ?? "", result.error?.message ?? ""]
      .filter(Boolean)
      .join("\n"),
  };
};

export const whichBinaryWith = async (
  name: string,
  execute: ProbeExecutor,
): Promise<string | undefined> => {
  const result = await execute({
    command: "which",
    args: [name],
    timeoutMs: 5_000,
  });
  return result.exitCode === 0 ? firstLine(result.stdout) : undefined;
};

export const whichBinary = (name: string): string | undefined => {
  const result = spawnSync("which", [name], { encoding: "utf8" });
  return result.status === 0 ? firstLine(result.stdout ?? "") : undefined;
};

export const readVersionLineWith = async (
  binary: string,
  execute: ProbeExecutor,
): Promise<string | undefined> => {
  for (const args of VERSION_ARGUMENTS) {
    const result = await execute({ command: binary, args, timeoutMs: 5_000 });
    const output = `${result.stdout}${result.stderr}`;
    if (result.exitCode === 0 && output.trim()) return firstLine(output);
  }
  return undefined;
};

export const readVersionLine = (binary: string): string | undefined => {
  for (const args of VERSION_ARGUMENTS) {
    const result = spawnSync(binary, [...args], {
      encoding: "utf8",
      timeout: 5_000,
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    if (result.status === 0 && output.trim()) return firstLine(output);
  }
  return undefined;
};

const probeEntryWith = async (
  id: AgentId,
  execute: ProbeExecutor,
): Promise<ProbeHit | null> => {
  const entry = CATALOG.find((candidate) => candidate.id === id);
  if (!entry) return null;
  for (const name of entry.binaries) {
    const binary = await whichBinaryWith(name, execute);
    if (!binary) continue;
    const versionLine = await readVersionLineWith(binary, execute);
    return versionLine
      ? { id, binary, versionLine }
      : { id, binary };
  }
  return null;
};

export const probeInstalledAgentsWith = async (
  execute: ProbeExecutor,
): Promise<readonly ProbeHit[]> => {
  const hits: ProbeHit[] = [];
  for (const entry of CATALOG) {
    const hit = await probeEntryWith(entry.id, execute);
    if (hit) hits.push(hit);
  }
  return hits;
};

export const probeOne = (id: AgentId): Effect.Effect<ProbeHit | null> =>
  Effect.promise(() => probeEntryWith(id, hostExecutor));

export const probeAll = (): Effect.Effect<readonly ProbeHit[]> =>
  Effect.promise(() => probeInstalledAgentsWith(hostExecutor));

export const probeInstalledAgents = (): Promise<readonly ProbeHit[]> =>
  probeInstalledAgentsWith(hostExecutor);
