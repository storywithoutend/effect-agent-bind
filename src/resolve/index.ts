import { Effect } from "effect";
import {
  isAgentId,
  type AgentSelection,
  type ProbeHit,
  type ResolvedAgent,
} from "../catalog/index.js";
import { probeOne } from "../probe/index.js";

export class ResolveError extends Error {
  readonly _tag = "ResolveError";

  constructor(
    readonly code: "not_allowlisted" | "not_found",
    message: string,
  ) {
    super(message);
  }
}

export class SelectionError extends Error {
  readonly _tag = "SelectionError";

  constructor(
    readonly code: "not_found" | "ambiguous",
    message: string,
  ) {
    super(message);
  }
}

export const selectAgent = (
  selection: AgentSelection,
  hits: readonly ProbeHit[],
): ResolvedAgent => {
  if (selection.kind === "explicit") {
    const hit = hits.find((entry) => entry.id === selection.id);
    if (!hit) {
      throw new SelectionError(
        "not_found",
        `agent '${selection.id}' is allowlisted but not installed`,
      );
    }
    return { id: hit.id, binary: hit.binary };
  }

  if (selection.preference) {
    for (const id of selection.preference) {
      const hit = hits.find((entry) => entry.id === id);
      if (hit) return { id: hit.id, binary: hit.binary };
    }
    throw new SelectionError(
      "not_found",
      "none of the preferred agents are installed",
    );
  }

  if (hits.length === 0) {
    throw new SelectionError("not_found", "no allowlisted agents are installed");
  }
  if (hits.length > 1) {
    throw new SelectionError(
      "ambiguous",
      `automatic selection is ambiguous: ${hits.map((entry) => entry.id).join(", ")}`,
    );
  }
  const hit = hits[0];
  if (!hit) {
    throw new SelectionError("not_found", "no allowlisted agents are installed");
  }
  return { id: hit.id, binary: hit.binary };
};

export const resolveAgent = (
  id: string,
): Effect.Effect<ResolvedAgent, ResolveError> =>
  Effect.gen(function* () {
    if (!isAgentId(id)) {
      return yield* Effect.fail(
        new ResolveError(
          "not_allowlisted",
          `agent id '${id}' is not in the allowlist`,
        ),
      );
    }
    const hit = yield* probeOne(id);
    if (!hit) {
      return yield* Effect.fail(
        new ResolveError(
          "not_found",
          `agent '${id}' is allowlisted but not found on PATH`,
        ),
      );
    }
    return { id: hit.id, binary: hit.binary };
  });
