import { describe, expect, it } from "vitest";
import {
  SelectionError,
  selectAgent,
} from "../src/resolve/index.js";
import type { ProbeHit } from "../src/catalog/index.js";

const hits: readonly ProbeHit[] = [
  {
    id: "claude",
    binary: "/bin/claude",
  },
  {
    id: "codex",
    binary: "/bin/codex",
  },
  {
    id: "pi",
    binary: "/bin/pi",
  },
];

describe("selectAgent", () => {
  it("selects an explicitly requested installed harness", () => {
    expect(
      selectAgent({ kind: "explicit", id: "codex" }, hits),
    ).toEqual({ id: "codex", binary: "/bin/codex" });
  });

  it("fails closed when automatic selection is ambiguous", () => {
    expect(() => selectAgent({ kind: "auto" }, hits)).toThrow(SelectionError);
  });

  it("uses the caller's explicit automatic preference order", () => {
    expect(
      selectAgent(
        { kind: "auto", preference: ["gemini", "pi", "claude"] },
        hits,
      ),
    ).toEqual({ id: "pi", binary: "/bin/pi" });
  });

  it("rejects an unavailable explicit harness", () => {
    expect(() =>
      selectAgent({ kind: "explicit", id: "grok" }, hits),
    ).toThrow(SelectionError);
  });
});
