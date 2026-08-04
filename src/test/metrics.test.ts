import { describe, it, expect, vi } from "vitest";
import { newUsageTotals, withUsageTracking } from "@/lib/graph/metrics";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function fakeModel(usage_metadata?: { input_tokens: number; output_tokens: number; total_tokens: number }): BaseChatModel {
  return {
    invoke: vi.fn().mockResolvedValue({ content: "hi", usage_metadata }),
  } as unknown as BaseChatModel;
}

describe("withUsageTracking", () => {
  it("accumulates input/output tokens and call count across multiple invokes", async () => {
    const totals = newUsageTotals();
    const model = fakeModel({ input_tokens: 10, output_tokens: 5, total_tokens: 15 });
    const tracked = withUsageTracking(model, totals);

    await tracked.invoke("first");
    await tracked.invoke("second");

    expect(totals).toEqual({ input: 20, output: 10, calls: 2 });
  });

  it("does not throw and leaves totals unchanged when usage_metadata is missing", async () => {
    const totals = newUsageTotals();
    const model = fakeModel(undefined);
    const tracked = withUsageTracking(model, totals);

    const result = await tracked.invoke("question");

    expect(result).toEqual({ content: "hi", usage_metadata: undefined });
    expect(totals).toEqual({ input: 0, output: 0, calls: 1 });
  });

  it("still delegates the actual response content unchanged", async () => {
    const totals = newUsageTotals();
    const model = fakeModel({ input_tokens: 1, output_tokens: 1, total_tokens: 2 });
    const tracked = withUsageTracking(model, totals);

    const result = await tracked.invoke("question");

    expect((result as { content: string }).content).toBe("hi");
  });
});
