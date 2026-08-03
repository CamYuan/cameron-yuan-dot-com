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

export const InterviewState = Annotation.Root({
  question: Annotation<string>(questionConfig),
  labels: Annotation<SpecialistLabel[]>(labelsConfig),
  answers: Annotation<Record<string, SpecialistAnswer>>(answersConfig),
  citations: Annotation<string[]>(citationsConfig),
  finalAnswer: Annotation<string>(finalAnswerConfig),
});

// Reducer/default configs, exposed separately for unit testing — NOT attached to
// InterviewState itself, since Annotation.Root already reserves `.spec` internally
// for its own channel definitions and overwriting it breaks graph construction.
export const reducerSpec = {
  question: questionConfig,
  labels: labelsConfig,
  answers: answersConfig,
  citations: citationsConfig,
  finalAnswer: finalAnswerConfig,
} as const;

export type InterviewStateType = typeof InterviewState.State;
