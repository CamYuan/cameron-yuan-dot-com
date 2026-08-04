import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AIMessage } from "@langchain/core/messages";

export interface UsageTotals {
  input: number;
  output: number;
  calls: number;
  hasUsage: boolean;
}

export function newUsageTotals(): UsageTotals {
  return { input: 0, output: 0, calls: 0, hasUsage: false };
}

export function withUsageTracking(model: BaseChatModel, totals: UsageTotals): BaseChatModel {
  return {
    invoke: async (...args: Parameters<BaseChatModel["invoke"]>) => {
      const result = await model.invoke(...args);
      totals.calls += 1;
      const usage = (result as AIMessage).usage_metadata;
      if (usage) {
        totals.hasUsage = true;
        totals.input += usage.input_tokens ?? 0;
        totals.output += usage.output_tokens ?? 0;
      }
      return result;
    },
  } as unknown as BaseChatModel;
}
