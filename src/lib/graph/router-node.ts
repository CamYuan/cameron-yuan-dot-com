import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { SpecialistLabel } from "@/lib/graph/state";

const KNOWN_LABELS: SpecialistLabel[] = ["experience", "projects", "skills"];

const ROUTER_PROMPT = `You are a router that classifies a visitor's question about Cameron Yuan's portfolio site into zero or more of these categories: "experience", "projects", "skills".

- "experience" = questions about jobs, employers, or professional history
- "projects" = questions about specific things Cameron built (Nucleus, AutoEtsy, Gaka, etc.)
- "skills" = questions about technologies, tools, or capabilities

A question can match multiple categories (e.g. "have you worked with microservices?" is both experience and projects). If the question is small talk or unrelated to Cameron's work, return an empty array.

Respond with ONLY a JSON object of the form {"labels": ["experience"]} — no other text.

Question: `;

export async function classifyQuestion(
  model: BaseChatModel,
  question: string,
): Promise<SpecialistLabel[]> {
  const response = await model.invoke(ROUTER_PROMPT + question);
  const content = typeof response.content === "string" ? response.content : "";

  try {
    const parsed = JSON.parse(content) as { labels?: unknown };
    if (!Array.isArray(parsed.labels)) return [];
    return parsed.labels.filter((label): label is SpecialistLabel =>
      KNOWN_LABELS.includes(label as SpecialistLabel),
    );
  } catch {
    return [];
  }
}
