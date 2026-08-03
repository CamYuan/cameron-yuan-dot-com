import { describe, it, expect, vi } from "vitest";
import {
  runExperienceAgent,
  runProjectsAgent,
  runSkillsAgent,
  runGeneralAgent,
} from "@/lib/graph/specialist-nodes";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function fakeModel(response: string): BaseChatModel {
  return {
    invoke: vi.fn().mockResolvedValue({ content: response }),
  } as unknown as BaseChatModel;
}

describe("runExperienceAgent", () => {
  it("returns a phrased answer with a source citation", async () => {
    const model = fakeModel("Yes, extensively — 190 microservices at Mastercard.");
    const result = await runExperienceAgent(model, "Have you worked with microservices?");
    expect(result?.text).toContain("microservices");
    expect(result?.source).toBe("Mastercard — Smart Data");
  });

  it("returns undefined when the tool finds no matching facts", async () => {
    const model = fakeModel("irrelevant");
    const result = await runExperienceAgent(model, "underwater basket weaving");
    expect(result).toBeUndefined();
  });
});

describe("runProjectsAgent", () => {
  it("returns a phrased answer citing the matching project", async () => {
    const model = fakeModel("AutoEtsy is a 7-agent pipeline that runs an Etsy shop end-to-end.");
    const result = await runProjectsAgent(model, "tell me about your etsy shop");
    expect(result?.source).toBe("Project — AutoEtsy — Autonomous AI Shop Manager");
  });
});

describe("runSkillsAgent", () => {
  it("returns a phrased answer citing the AI & Agents skill group", async () => {
    const model = fakeModel("Claude API, LangChain, LangGraph, and RAG pipelines.");
    const result = await runSkillsAgent(model, "what langchain skills do you have");
    expect(result?.source).toBe("Skills — AI & Agents");
  });
});

describe("runGeneralAgent", () => {
  it("returns a static redirect without calling the model", async () => {
    const model = fakeModel("should not be used");
    const result = await runGeneralAgent();
    expect(result.text).toContain("experience, projects, or skills");
    expect(model.invoke).not.toHaveBeenCalled();
  });
});
