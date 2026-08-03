import { ChatOpenAI } from "@langchain/openai";

const OPENROUTER_MODEL = "meta-llama/llama-3.1-8b-instruct:free";

export function createModel(): ChatOpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return new ChatOpenAI({
    apiKey,
    model: OPENROUTER_MODEL,
    temperature: 0,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
}
