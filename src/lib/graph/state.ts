import { Annotation } from "@langchain/langgraph";

export type SpecialistLabel = "experience" | "projects" | "skills";

export interface SpecialistAnswer {
  text: string;
  source: string;
}

const questionConfig = {
  reducer: (_prev: string, next: string) => next,
  default: () => "",
};

const labelsConfig = {
  reducer: (_prev: SpecialistLabel[], next: SpecialistLabel[]) => next,
  default: () => [] as SpecialistLabel[],
};

const answersConfig = {
  reducer: (prev: Record<string, SpecialistAnswer>, next: Record<string, SpecialistAnswer>) => ({
    ...prev,
    ...next,
  }),
  default: () => ({} as Record<string, SpecialistAnswer>),
};

const citationsConfig = {
  reducer: (prev: string[], next: string[]) => [...prev, ...next],
  default: () => [] as string[],
};

const finalAnswerConfig = {
  reducer: (_prev: string, next: string) => next,
  default: () => "",
};

const _InterviewState = Annotation.Root({
  question: Annotation<string>(questionConfig),
  labels: Annotation<SpecialistLabel[]>(labelsConfig),
  answers: Annotation<Record<string, SpecialistAnswer>>(answersConfig),
  citations: Annotation<string[]>(citationsConfig),
  finalAnswer: Annotation<string>(finalAnswerConfig),
});

// Export configs for testing - expose the same interface as the test expects
export const spec = {
  question: questionConfig,
  labels: labelsConfig,
  answers: answersConfig,
  citations: citationsConfig,
  finalAnswer: finalAnswerConfig,
} as const;

export const InterviewState = Object.assign(_InterviewState, { spec }) as typeof _InterviewState & { spec: typeof spec };

export type InterviewStateType = typeof _InterviewState.State;
