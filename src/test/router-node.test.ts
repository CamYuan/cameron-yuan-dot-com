import { describe, it, expect, vi } from "vitest";
import { classifyQuestion } from "@/lib/graph/router-node";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function fakeModel(response: string): BaseChatModel {
  return {
    invoke: vi.fn().mockResolvedValue({ content: response }),
  } as unknown as BaseChatModel;
}

describe("classifyQuestion", () => {
  it("parses a single-label JSON response", async () => {
    const model = fakeModel('{"labels": ["skills"]}');
    const labels = await classifyQuestion(model, "What AI skills do you have?");
    expect(labels).toEqual(["skills"]);
  });

  it("parses a multi-label JSON response for a cross-cutting question", async () => {
    const model = fakeModel('{"labels": ["experience", "projects"]}');
    const labels = await classifyQuestion(model, "Have you worked with microservices?");
    expect(labels).toEqual(["experience", "projects"]);
  });

  it("falls back to an empty array (general) on unparseable output", async () => {
    const model = fakeModel("sorry, I don't understand the format");
    const labels = await classifyQuestion(model, "what's your favorite color?");
    expect(labels).toEqual([]);
  });

  it("drops labels outside the known set", async () => {
    const model = fakeModel('{"labels": ["experience", "weather"]}');
    const labels = await classifyQuestion(model, "anything");
    expect(labels).toEqual(["experience"]);
  });
});
