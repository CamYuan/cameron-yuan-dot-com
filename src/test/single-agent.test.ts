import { describe, it, expect, vi } from "vitest";
import { runSingleAgent } from "@/lib/graph/single-agent";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function fakeModel(content: string): BaseChatModel {
  return {
    invoke: vi.fn().mockResolvedValue({ content }),
  } as unknown as BaseChatModel;
}

describe("runSingleAgent", () => {
  it("returns the model's answer and a measured elapsed time", async () => {
    const model = fakeModel("Yes, I've worked with microservices at Mastercard.");
    const result = await runSingleAgent(model, "Have you worked with microservices?");

    expect(result.answer).toBe("Yes, I've worked with microservices at Mastercard.");
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("sends the full resume content in the prompt", async () => {
    const model = fakeModel("answer");
    await runSingleAgent(model, "What have you built?");

    const promptArg = (model.invoke as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(promptArg).toContain("Mastercard");
    expect(promptArg).toContain("Nucleus");
    expect(promptArg).toContain("LangChain");
  });
});
