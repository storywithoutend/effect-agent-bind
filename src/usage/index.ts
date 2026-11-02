import type { AgentId, NormalizedUsage } from "../catalog/index.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const numbersForKeys = (
  value: unknown,
  keys: ReadonlySet<string>,
): readonly number[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => numbersForKeys(entry, keys));
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => [
    ...(keys.has(key) && typeof entry === "number" ? [entry] : []),
    ...numbersForKeys(entry, keys),
  ]);
};

const stringsForKeys = (
  value: unknown,
  keys: ReadonlySet<string>,
): readonly string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => stringsForKeys(entry, keys));
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => [
    ...(keys.has(key) && typeof entry === "string" ? [entry] : []),
    ...stringsForKeys(entry, keys),
  ]);
};

const last = (values: readonly number[]): number =>
  values.length === 0 ? 0 : (values[values.length - 1] ?? 0);

const parseLines = (output: string): readonly unknown[] =>
  output
    .split("\n")
    .filter((line) => line.trim())
    .flatMap((line) => {
      try {
        const parsed: unknown = JSON.parse(line);
        return [parsed];
      } catch {
        return [];
      }
    });

const piV3Usage = (
  entries: readonly unknown[],
  wallClockSeconds: number,
  output: string,
): NormalizedUsage => {
  const assistantUsages = entries.flatMap((entry) => {
    if (!isRecord(entry) || entry.type !== "message_end" || !isRecord(entry.message)) return [];
    if (entry.message.role !== "assistant" || !isRecord(entry.message.usage)) return [];
    return [entry.message.usage];
  });
  const sum = (key: string): number => assistantUsages.reduce(
    (total, usage) => total + (typeof usage[key] === "number" ? usage[key] : 0),
    0,
  );
  const totalCostUsd = assistantUsages.reduce((total, usage) => {
    if (!isRecord(usage.cost) || typeof usage.cost.total !== "number") return total;
    return total + usage.cost.total;
  }, 0);
  return {
    inputTokens: sum("input"),
    outputTokens: sum("output"),
    totalCostUsd,
    wallClockSeconds,
    turnCount: entries.filter((entry) => isRecord(entry) && entry.type === "turn_end").length,
    commandCount: entries.filter((entry) => isRecord(entry) && entry.type === "tool_execution_start").length,
    outputBytes: Buffer.byteLength(output),
  };
};

const isCommandEvent = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  const types = stringsForKeys(value, new Set(["type", "kind", "tool_name", "name"]));
  return types.some((entry) =>
    /^(Bash|bash|shell|run_shell_command|command_execution|terminal)$/i.test(
      entry,
    ),
  );
};

export const normalizeUsage = (
  agentId: AgentId,
  output: string,
  wallClockSeconds: number,
): NormalizedUsage => {
  const entries = parseLines(output);
  if (agentId === "pi" && entries.some((entry) => isRecord(entry) && entry.type === "session" && entry.version === 3)) {
    return piV3Usage(entries, wallClockSeconds, output);
  }
  const inputTokens = last(
    numbersForKeys(
      entries,
      new Set([
        "input_tokens",
        "inputTokens",
        "prompt_tokens",
        "promptTokenCount",
      ]),
    ),
  );
  const outputTokens = last(
    numbersForKeys(
      entries,
      new Set([
        "output_tokens",
        "outputTokens",
        "completion_tokens",
        "candidatesTokenCount",
      ]),
    ),
  );
  const totalCostUsd = last(
    numbersForKeys(
      entries,
      new Set(["total_cost_usd", "totalCostUsd", "cost_usd", "costUsd"]),
    ),
  );
  const reportedTurns = last(
    numbersForKeys(entries, new Set(["num_turns", "turnCount", "turns"])),
  );
  const inferredTurns = entries.filter((entry) => {
    if (!isRecord(entry)) return false;
    return entry.type === "assistant" || entry.type === "turn.completed";
  }).length;

  return {
    inputTokens,
    outputTokens,
    totalCostUsd,
    wallClockSeconds,
    turnCount: reportedTurns || inferredTurns,
    commandCount: entries.filter(isCommandEvent).length,
    outputBytes: Buffer.byteLength(output),
  };
};
