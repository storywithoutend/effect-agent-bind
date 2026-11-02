import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { resolveAgent, ResolveError } from "../src/resolve/index.js";

describe("resolveAgent", () => {
  it("rejects unknown id", async () => {
    const r = await Effect.runPromise(Effect.either(resolveAgent("not-a-real-agent")));
    expect(r._tag).toBe("Left");
    if (r._tag === "Left") {
      expect(r.left).toBeInstanceOf(ResolveError);
      expect(r.left.code).toBe("not_allowlisted");
    }
  });
});
