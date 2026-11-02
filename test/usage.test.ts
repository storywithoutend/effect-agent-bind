import { describe, expect, it } from "vitest";
import { normalizeUsage } from "../src/usage/index.js";

describe("normalizeUsage", () => {
  it("normalizes Claude stream JSON usage and command calls", () => {
    const output = [
      JSON.stringify({
        type: "assistant",
        message: {
          content: [{ type: "tool_use", name: "Bash" }],
        },
      }),
      JSON.stringify({
        type: "result",
        usage: { input_tokens: 120, output_tokens: 30 },
        total_cost_usd: 0.004,
        num_turns: 2,
      }),
    ].join("\n");

    expect(normalizeUsage("claude", output, 1.5)).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      totalCostUsd: 0.004,
      wallClockSeconds: 1.5,
      turnCount: 2,
      commandCount: 1,
      outputBytes: Buffer.byteLength(output),
    });
  });

  it("normalizes camel-case usage and shell tool events", () => {
    const output = [
      JSON.stringify({
        type: "tool_call",
        tool_name: "run_shell_command",
      }),
      JSON.stringify({
        type: "completed",
        usage: { inputTokens: 12, outputTokens: 8, costUsd: 0.01 },
        turns: 3,
      }),
    ].join("\n");

    expect(normalizeUsage("gemini", output, 2)).toMatchObject({
      inputTokens: 12,
      outputTokens: 8,
      totalCostUsd: 0.01,
      turnCount: 3,
      commandCount: 1,
    });
  });

  it("sums Pi v3 assistant usage without double-counting the final session payload", () => {
    const first = {
      role: "assistant",
      usage: { input: 10, output: 4, cost: { total: 0.01 } },
    };
    const second = {
      role: "assistant",
      usage: { input: 6, output: 2, cost: { total: 0.005 } },
    };
    const output = [
      JSON.stringify({ type: "session", version: 3 }),
      JSON.stringify({ type: "message_end", message: first }),
      JSON.stringify({ type: "tool_execution_start", toolName: "write" }),
      JSON.stringify({ type: "turn_end", message: first }),
      JSON.stringify({ type: "message_end", message: second }),
      JSON.stringify({ type: "turn_end", message: second }),
      JSON.stringify({ type: "agent_end", messages: [first, second] }),
    ].join("\n");

    expect(normalizeUsage("pi", output, 3)).toMatchObject({
      inputTokens: 16,
      outputTokens: 6,
      totalCostUsd: 0.015,
      turnCount: 2,
      commandCount: 1,
    });
  });

  it("returns zeroes for structured output without usage fields", () => {
    expect(normalizeUsage("pi", '{"type":"message","text":"ok"}', 0.5))
      .toMatchObject({
        inputTokens: 0,
        outputTokens: 0,
        totalCostUsd: 0,
        turnCount: 0,
        commandCount: 0,
        wallClockSeconds: 0.5,
      });
  });
});
