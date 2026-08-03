import { describe, it, expect, vi } from "vitest";
import { synthesize } from "@/lib/graph/synthesizer-node";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { SpecialistAnswer } from "@/lib/graph/state";

function fakeModel(response: string): BaseChatModel {
  return {
    invoke: vi.fn().mockResolvedValue({ content: response }),
  } as unknown as BaseChatModel;
}

describe("synthesize", () => {
  it("passes a single answer through without calling the model", async () => {
    const model = fakeModel("should not be used");
    const answers: Record<string, SpecialistAnswer> = {
      skills: { text: "Claude API, LangGraph.", source: "Skills — AI & Agents" },
    };
    const result = await synthesize(model, answers);
    expect(result.finalAnswer).toBe("Claude API, LangGraph.");
    expect(result.citations).toEqual(["Skills — AI & Agents"]);
    expect(model.invoke).not.toHaveBeenCalled();
  });

  it("merges multiple answers via the model and collects all citations", async () => {
    const model = fakeModel("Yes — 190 microservices at Mastercard, and Nucleus is itself multi-agent.");
    const answers: Record<string, SpecialistAnswer> = {
      experience: { text: "190 microservices at Mastercard.", source: "Mastercard — Smart Data" },
      projects: { text: "Nucleus coordinates agents via git worktrees.", source: "Project — Nucleus" },
    };
    const result = await synthesize(model, answers);
    expect(result.finalAnswer).toContain("Mastercard");
    expect(result.citations).toEqual(["Mastercard — Smart Data", "Project — Nucleus"]);
    expect(model.invoke).toHaveBeenCalledOnce();
  });

  it("returns the general fallback text when there are no answers", async () => {
    const model = fakeModel("should not be used");
    const result = await synthesize(model, {});
    expect(result.finalAnswer).toContain("experience, projects, or skills");
    expect(result.citations).toEqual([]);
    expect(model.invoke).not.toHaveBeenCalled();
  });
});
