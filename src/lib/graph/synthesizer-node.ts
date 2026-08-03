import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { SpecialistAnswer } from "@/lib/graph/state";
import { runGeneralAgent } from "@/lib/graph/specialist-nodes";

export interface SynthesisResult {
  finalAnswer: string;
  citations: string[];
}

export async function synthesize(
  model: BaseChatModel,
  answers: Record<string, SpecialistAnswer>,
): Promise<SynthesisResult> {
  const entries = Object.values(answers);

  if (entries.length === 0) {
    const fallback = await runGeneralAgent();
    return { finalAnswer: fallback.text, citations: [] };
  }

  if (entries.length === 1) {
    return { finalAnswer: entries[0].text, citations: [entries[0].source] };
  }

  const combined = entries.map((a) => `- ${a.text} (source: ${a.source})`).join("\n");
  const prompt = `Merge these separate answers into one coherent 2-4 sentence response for the visitor. Keep every fact, don't invent new ones:\n${combined}\n\nMerged answer:`;
  const response = await model.invoke(prompt);
  const finalAnswer = typeof response.content === "string" ? response.content : combined;

  return { finalAnswer, citations: entries.map((a) => a.source) };
}
