import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/graph/model", () => ({
  createModel: vi.fn(),
}));

vi.mock("@/lib/graph/single-agent", () => ({
  runSingleAgent: vi.fn().mockResolvedValue({
    answer: "Yes, 190 microservices at Mastercard.",
    elapsedMs: 42,
  }),
}));

vi.mock("@/lib/graph/build-graph", () => ({
  buildInterviewGraph: vi.fn(() => ({
    streamEvents: vi.fn().mockImplementation(async function* () {
      yield { event: "on_chain_start", name: "router", data: {} };
      yield { event: "on_chain_end", name: "router", data: {} };
      yield { event: "on_chain_start", name: "skillsAgent", data: {} };
      yield { event: "on_chain_end", name: "skillsAgent", data: {} };
      yield {
        event: "on_chain_end",
        name: "synthesizer",
        data: { output: { finalAnswer: "Claude API and LangGraph.", citations: ["Skills — AI & Agents"] } },
      };
    }),
  })),
}));

import { POST } from "@/app/api/interview/compare/route";

describe("POST /api/interview/compare", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  it("streams flow-tagged events for both the single-agent and graph flows", async () => {
    const req = new Request("http://localhost/api/interview/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "what ai skills do you have?" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const text = await res.text();
    const lines = text.trim().split("\n").map((l) => JSON.parse(l));

    expect(lines.some((l) => l.flow === "single" && l.type === "node" && l.name === "singleAgent")).toBe(true);
    expect(lines.some((l) => l.flow === "single" && l.type === "result" && l.finalAnswer.includes("Mastercard"))).toBe(true);
    expect(lines.some((l) => l.flow === "graph" && l.type === "node" && l.name === "router")).toBe(true);
    expect(lines.some((l) => l.flow === "graph" && l.type === "result" && l.finalAnswer.includes("Claude"))).toBe(true);
  });

  it("includes elapsedMs and a nullable tokenUsage on both result events", async () => {
    const req = new Request("http://localhost/api/interview/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "what ai skills do you have?" }),
    });

    const res = await POST(req);
    const text = await res.text();
    const lines = text.trim().split("\n").map((l) => JSON.parse(l));
    const results = lines.filter((l) => l.type === "result");

    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(typeof result.elapsedMs).toBe("number");
      expect(result.tokenUsage).toBeNull();
    }
  });

  it("returns 400 when question is missing", async () => {
    const req = new Request("http://localhost/api/interview/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
