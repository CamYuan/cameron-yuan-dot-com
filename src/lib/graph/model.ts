import { ChatOpenAI } from "@langchain/openai";

// openrouter/free auto-routes across whichever free models are currently live,
// so this doesn't break every time OpenRouter rotates their free-tier roster.
// Override via OPENROUTER_MODEL to pin a specific slug if ever needed.
const DEFAULT_MODEL = "openrouter/free";

export function createModel(): ChatOpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return new ChatOpenAI({
    apiKey,
    model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
    temperature: 0,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
}
