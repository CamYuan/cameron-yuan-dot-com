import { describe, it, expect } from "vitest";
import { reducerSpec } from "@/lib/graph/state";

describe("InterviewState", () => {
  it("has a default state with empty labels and answers", () => {
    const spec = reducerSpec;
    expect(spec.labels.default()).toEqual([]);
    expect(spec.answers.default()).toEqual({});
    expect(spec.citations.default()).toEqual([]);
    expect(spec.finalAnswer.default()).toBe("");
  });

  it("merges answers via the answers reducer instead of overwriting", () => {
    const spec = reducerSpec;
    const merged = spec.answers.reducer(
      { experience: { text: "a", source: "s1" } },
      { projects: { text: "b", source: "s2" } },
    );
    expect(merged).toEqual({
      experience: { text: "a", source: "s1" },
      projects: { text: "b", source: "s2" },
    });
  });
});
