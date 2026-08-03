import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/graph/model", () => ({
  createModel: vi.fn(),
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

import { POST } from "@/app/api/interview/route";

describe("POST /api/interview", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  it("streams node events and a final result", async () => {
    const req = new Request("http://localhost/api/interview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "what ai skills do you have?" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const text = await res.text();
    const lines = text.trim().split("\n").map((l) => JSON.parse(l));

    expect(lines.some((l) => l.type === "node" && l.name === "router")).toBe(true);
    expect(lines.some((l) => l.type === "result" && l.finalAnswer.includes("Claude"))).toBe(true);
  });

  it("returns 400 when question is missing", async () => {
    const req = new Request("http://localhost/api/interview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
