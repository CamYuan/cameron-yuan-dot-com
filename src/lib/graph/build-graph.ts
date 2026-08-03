import { StateGraph, END, START } from "@langchain/langgraph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { InterviewState, type SpecialistLabel } from "@/lib/graph/state";
import { classifyQuestion } from "@/lib/graph/router-node";
import {
  runExperienceAgent,
  runProjectsAgent,
  runSkillsAgent,
} from "@/lib/graph/specialist-nodes";
import { synthesize } from "@/lib/graph/synthesizer-node";

const NODE_NAMES: Record<SpecialistLabel, string> = {
  experience: "experienceAgent",
  projects: "projectsAgent",
  skills: "skillsAgent",
};

export function buildInterviewGraph(model: BaseChatModel) {
  const graph = new StateGraph(InterviewState)
    .addNode("router", async (state) => {
      const labels = await classifyQuestion(model, state.question);
      return { labels };
    })
    .addNode("experienceAgent", async (state) => {
      const answer = await runExperienceAgent(model, state.question);
      return answer ? { answers: { experience: answer } } : {};
    })
    .addNode("projectsAgent", async (state) => {
      const answer = await runProjectsAgent(model, state.question);
      return answer ? { answers: { projects: answer } } : {};
    })
    .addNode("skillsAgent", async (state) => {
      const answer = await runSkillsAgent(model, state.question);
      return answer ? { answers: { skills: answer } } : {};
    })
    .addNode("synthesizer", async (state) => {
      const result = await synthesize(model, state.answers);
      return { finalAnswer: result.finalAnswer, citations: result.citations };
    })
    .addEdge(START, "router")
    .addConditionalEdges(
      "router",
      (state) => (state.labels.length === 0 ? ["synthesizer"] : state.labels.map((l) => NODE_NAMES[l])),
      ["experienceAgent", "projectsAgent", "skillsAgent", "synthesizer"],
    )
    .addEdge("experienceAgent", "synthesizer")
    .addEdge("projectsAgent", "synthesizer")
    .addEdge("skillsAgent", "synthesizer")
    .addEdge("synthesizer", END);

  return graph.compile();
}
