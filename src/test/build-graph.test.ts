import { describe, it, expect, vi } from "vitest";
import { buildInterviewGraph } from "@/lib/graph/build-graph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function fakeModel(routerLabelsJson: string): BaseChatModel {
  const invoke = vi.fn().mockImplementation(async (prompt: string) => {
    if (prompt.includes("router that classifies")) {
      return { content: routerLabelsJson };
    }
    if (prompt.includes("Merge these separate answers")) {
      return {
        content: "Yes — 190 microservices at Mastercard, and Nucleus is itself multi-agent.",
      };
    }
    if (prompt.includes("190 microservices")) {
      return { content: "190 microservices at Mastercard." };
    }
    if (prompt.includes("git worktrees")) {
      return { content: "Nucleus coordinates agents via git worktrees." };
    }
    if (prompt.includes("LangChain")) {
      return { content: "Claude API, LangChain, LangGraph." };
    }
    return { content: "" };
  });
  return { invoke } as unknown as BaseChatModel;
}

describe("buildInterviewGraph", () => {
  it("runs the single-label path end to end", async () => {
    const model = fakeModel('{"labels": ["skills"]}');
    const graph = buildInterviewGraph(model);
    const result = await graph.invoke({ question: "Do you have experience with LangChain and LangGraph?" });
    expect(result.finalAnswer).toContain("LangChain");
    expect(result.citations).toEqual(["Skills — AI & Agents"]);
  });

  it("runs the multi-label fan-out/join path end to end", async () => {
    const model = fakeModel('{"labels": ["experience", "projects"]}');
    const graph = buildInterviewGraph(model);
    const result = await graph.invoke({ question: "Have you worked with microservices and git worktrees?" });
    expect(result.finalAnswer).toContain("Mastercard");
    expect(result.citations).toEqual(
      expect.arrayContaining(["Mastercard — Smart Data", "Project — Nucleus — Multi-Agent Coding Hub"]),
    );
  });

  it("runs the general fallback path when the router returns no labels", async () => {
    const model = fakeModel('{"labels": []}');
    const graph = buildInterviewGraph(model);
    const result = await graph.invoke({ question: "what's the weather like?" });
    expect(result.finalAnswer).toContain("experience, projects, or skills");
  });
});
