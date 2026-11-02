import { describe, expect, it } from "vitest";
import {
  probeInstalledAgents,
  probeInstalledAgentsWith,
} from "../src/probe/index.js";

describe("probe", () => {
  it("finds at least one allowlisted local agent in this development environment", async () => {
    const hits = await probeInstalledAgents();
    expect(hits.length).toBeGreaterThan(0);
  });

  it("probes through a caller-owned process boundary", async () => {
    const calls: Array<{ readonly command: string; readonly args: readonly string[] }> = [];
    const hits = await probeInstalledAgentsWith(async (input) => {
      calls.push({ command: input.command, args: input.args });
      if (input.command === "which" && input.args[0] === "claude") {
        return { exitCode: 0, stdout: "/sandbox/bin/claude\n", stderr: "" };
      }
      if (input.command === "/sandbox/bin/claude" && input.args[0] === "--version") {
        return { exitCode: 0, stdout: "claude sandbox version\n", stderr: "" };
      }
      return { exitCode: 1, stdout: "", stderr: "missing" };
    });

    expect(hits).toEqual([
      {
        id: "claude",
        binary: "/sandbox/bin/claude",
        versionLine: "claude sandbox version",
      },
    ]);
    expect(calls).toContainEqual({ command: "which", args: ["claude"] });
  });
});
