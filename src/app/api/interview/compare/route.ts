import { createModel } from "@/lib/graph/model";
import { buildInterviewGraph } from "@/lib/graph/build-graph";
import { runSingleAgent } from "@/lib/graph/single-agent";
import { checkRateLimit } from "@/lib/rate-limit";
import { withUsageTracking, newUsageTotals, type UsageTotals } from "@/lib/graph/metrics";

export const runtime = "nodejs";

const GRAPH_NODE_NAMES = new Set(["router", "experienceAgent", "projectsAgent", "skillsAgent", "synthesizer"]);
const OVERLOADED_MESSAGE = "my agent's a little overloaded — try again in a moment";

function tokenUsage(totals: UsageTotals): { input: number; output: number } | null {
  return totals.hasUsage ? { input: totals.input, output: totals.output } : null;
}

export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 20, 60_000)) {
    return new Response(JSON.stringify({ error: "rate limited" }), { status: 429 });
  }

  let question: string | undefined;
  try {
    const body = (await req.json()) as { question?: string };
    question = body.question;
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }

  if (!question || typeof question !== "string") {
    return new Response(JSON.stringify({ error: "question is required" }), { status: 400 });
  }
  const finalQuestion = question;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      }

      const singleFlow = (async () => {
        const totals = newUsageTotals();
        try {
          send({ flow: "single", type: "node", name: "singleAgent", status: "active" });
          const model = withUsageTracking(createModel(), totals);
          const { answer, elapsedMs } = await runSingleAgent(model, finalQuestion);
          send({ flow: "single", type: "node", name: "singleAgent", status: "done" });
          send({
            flow: "single",
            type: "result",
            finalAnswer: answer,
            elapsedMs,
            tokenUsage: tokenUsage(totals),
          });
        } catch {
          send({ flow: "single", type: "error", message: OVERLOADED_MESSAGE });
        }
      })();

      const graphFlow = (async () => {
        const totals = newUsageTotals();
        const start = Date.now();
        try {
          const model = withUsageTracking(createModel(), totals);
          const graph = buildInterviewGraph(model);

          for await (const event of graph.streamEvents({ question: finalQuestion }, { version: "v2" })) {
            if (!GRAPH_NODE_NAMES.has(event.name)) continue;

            if (event.event === "on_chain_start") {
              send({ flow: "graph", type: "node", name: event.name, status: "active" });
            } else if (event.event === "on_chain_end") {
              send({ flow: "graph", type: "node", name: event.name, status: "done" });
              if (event.name === "synthesizer") {
                const output = event.data.output as { finalAnswer: string; citations: string[] };
                send({
                  flow: "graph",
                  type: "result",
                  finalAnswer: output.finalAnswer,
                  citations: output.citations,
                  elapsedMs: Date.now() - start,
                  tokenUsage: tokenUsage(totals),
                });
              }
            }
          }
        } catch {
          send({ flow: "graph", type: "error", message: OVERLOADED_MESSAGE });
        }
      })();

      await Promise.all([singleFlow, graphFlow]);
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "content-type": "application/x-ndjson" },
  });
}
