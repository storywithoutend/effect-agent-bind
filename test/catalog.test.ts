import { describe, expect, it } from "vitest";
import { CATALOG, catalogById, isAgentId } from "../src/catalog/index.js";

describe("catalog", () => {
  it("has unique ids", () => {
    const ids = CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains the supported harness allowlist", () => {
    expect(CATALOG.map((entry) => entry.id)).toEqual([
      "claude",
      "codex",
      "pi",
      "gemini",
      "cursor",
      "grok",
    ]);
    expect(isAgentId("claude")).toBe(true);
    expect(isAgentId("nope")).toBe(false);
  });

  it("catalogById", () => {
    expect(catalogById("pi")?.binaries).toContain("pi");
    expect(catalogById("missing")).toBeUndefined();
  });
});
