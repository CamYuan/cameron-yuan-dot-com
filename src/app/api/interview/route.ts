import { createModel } from "@/lib/graph/model";
import { buildInterviewGraph } from "@/lib/graph/build-graph";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const GRAPH_NODE_NAMES = new Set(["router", "experienceAgent", "projectsAgent", "skillsAgent", "synthesizer"]);

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      }

      try {
        const model = createModel();
        const graph = buildInterviewGraph(model);

        for await (const event of graph.streamEvents(
          { question },
          { version: "v2" },
        )) {
          if (!GRAPH_NODE_NAMES.has(event.name)) continue;

          if (event.event === "on_chain_start") {
            send({ type: "node", name: event.name, status: "active" });
          } else if (event.event === "on_chain_end") {
            send({ type: "node", name: event.name, status: "done" });
            if (event.name === "synthesizer") {
              const output = event.data.output as { finalAnswer: string; citations: string[] };
              send({ type: "result", finalAnswer: output.finalAnswer, citations: output.citations });
            }
          }
        }
      } catch {
        send({
          type: "error",
          message: "my agent's a little overloaded — try again in a moment",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "content-type": "application/x-ndjson" },
  });
}
