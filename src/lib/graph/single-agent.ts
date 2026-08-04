import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { RESUME_DATA } from "@/data/resume";

export interface SingleAgentResult {
  answer: string;
  elapsedMs: number;
}

function formatResumeForPrompt(): string {
  const experience = RESUME_DATA.experience
    .flatMap((entry) => entry.roles.map((role) => `${role.sourceLabel}:\n${role.bullets.map((b) => `- ${b}`).join("\n")}`))
    .join("\n\n");

  const projects = RESUME_DATA.projects
    .map((p) => `${p.name}:\n${p.bullets.map((b) => `- ${b}`).join("\n")}`)
    .join("\n\n");

  const skills = RESUME_DATA.skills.map((g) => `${g.label}: ${g.items.join(", ")}`).join("\n");

  return `EXPERIENCE\n${experience}\n\nPROJECTS\n${projects}\n\nSKILLS\n${skills}`;
}

export async function runSingleAgent(model: BaseChatModel, question: string): Promise<SingleAgentResult> {
  const start = Date.now();
  const prompt = `Here is my full resume:\n\n${formatResumeForPrompt()}\n\nAnswer the visitor's question in 1-3 sentences, using ONLY the facts above — do not invent anything beyond them.\n\nQuestion: ${question}\n\nAnswer:`;
  const response = await model.invoke(prompt);
  const answer = typeof response.content === "string" ? response.content : "";
  return { answer, elapsedMs: Date.now() - start };
}
