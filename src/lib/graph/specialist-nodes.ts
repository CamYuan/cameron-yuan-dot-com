import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { experienceLookup, projectsLookup, skillsLookup } from "@/lib/graph/tools";
import type { SpecialistAnswer } from "@/lib/graph/state";

async function phraseAnswer(
  model: BaseChatModel,
  question: string,
  facts: SpecialistAnswer[],
): Promise<string> {
  const factText = facts.map((f) => `- ${f.text}`).join("\n");
  const prompt = `Answer the visitor's question in 1-3 sentences, using ONLY these facts (do not invent anything beyond them):\n${factText}\n\nQuestion: ${question}\n\nAnswer:`;
  const response = await model.invoke(prompt);
  return typeof response.content === "string" ? response.content : facts[0].text;
}

export async function runExperienceAgent(
  model: BaseChatModel,
  question: string,
): Promise<SpecialistAnswer | undefined> {
  const facts = experienceLookup(question);
  if (facts.length === 0) return undefined;
  const text = await phraseAnswer(model, question, facts);
  return { text, source: facts[0].source };
}

export async function runProjectsAgent(
  model: BaseChatModel,
  question: string,
): Promise<SpecialistAnswer | undefined> {
  const facts = projectsLookup(question);
  if (facts.length === 0) return undefined;
  const text = await phraseAnswer(model, question, facts);
  return { text, source: facts[0].source };
}

export async function runSkillsAgent(
  model: BaseChatModel,
  question: string,
): Promise<SpecialistAnswer | undefined> {
  const facts = skillsLookup(question);
  if (facts.length === 0) return undefined;
  const text = await phraseAnswer(model, question, facts);
  return { text, source: facts[0].source };
}

export async function runGeneralAgent(): Promise<SpecialistAnswer> {
  return {
    text: "I'm best at answering questions about my experience, projects, or skills — try asking about one of those!",
    source: "general",
  };
}
