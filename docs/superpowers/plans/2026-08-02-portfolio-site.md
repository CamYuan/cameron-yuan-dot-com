# cameron-yuan-dot-com Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a recruiter-facing portfolio site (Next.js + TypeScript, deployed on Vercel) whose centerpiece is a real LangGraph.js "interview my agent" demo — a multi-label Router node fanning out to Experience/Projects/Skills specialist nodes, joined by a Synthesizer node — visualized as an animated pipeline in a warm/playful ("peach") visual style.

**Architecture:** Single Next.js App Router app. Four routed pages (`/`, `/projects`, `/experience`, `/contact`) share a nav/footer shell and a small CSS design system. The demo lives behind `/api/interview`, a streaming API route running a LangGraph.js `StateGraph` whose nodes call OpenRouter's free tier through `@langchain/openai`'s `ChatOpenAI` (pointed at OpenRouter's OpenAI-compatible base URL). A single structured JSON file (`src/data/resume.ts`) is the one source of truth read by both the `Experience` page and the graph's specialist-node tools, so page content and demo answers never drift apart.

**Tech Stack:** Next.js 15 (App Router), TypeScript, `@langchain/langgraph` + `@langchain/core` + `@langchain/openai`, Vitest, plain CSS (no Tailwind — the design system is small enough that a shared stylesheet is simpler and matches the mockup's hand-tuned peach palette).

---

## File Structure

```
cameron-yuan-dot-com/
  package.json
  tsconfig.json
  next.config.ts
  vitest.config.ts
  .env.example
  src/
    data/
      resume.ts                 # single source of truth (from resume-data.js)
    lib/
      graph/
        state.ts                # LangGraph Annotation state shape
        tools.ts                 # experienceLookup / projectsLookup / skillsLookup
        model.ts                 # ChatOpenAI client configured for OpenRouter
        router-node.ts           # multi-label classifier node
        specialist-nodes.ts      # ExperienceAgent / ProjectsAgent / SkillsAgent / GeneralAgent
        synthesizer-node.ts      # merges specialist answers + citations
        build-graph.ts           # StateGraph wiring (fan-out/join)
      rate-limit.ts              # simple in-memory per-IP limiter
    app/
      layout.tsx                 # shared shell: <Nav/> + page container
      globals.css                # peach design system (from mockup)
      page.tsx                   # Home: hero + chat + pipeline viz
      projects/page.tsx
      experience/page.tsx
      contact/page.tsx
      api/
        interview/route.ts       # POST streaming endpoint wrapping the graph
    components/
      Nav.tsx
      ChatPanel.tsx               # input + message log + suggestions
      PipelineViz.tsx             # animated node graph, driven by stream events
    test/
      tools.test.ts
      router-node.test.ts
      specialist-nodes.test.ts
      synthesizer-node.test.ts
      build-graph.test.ts
      interview-route.test.ts
```

Rationale: graph logic is split one-file-per-responsibility (state / tools / model / each node type / wiring) so each file is small enough to hold in context and test in isolation — this mirrors the spec's Router → parallel specialists → Synthesizer shape directly in the file layout. `resume.ts` is imported by both the Experience page and `tools.ts`, satisfying the spec's "one source of truth" requirement structurally, not just by convention.

---

## Task 1: Scaffold the Next.js app

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `.gitignore` additions
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` (placeholder versions, replaced in later tasks)

- [ ] **Step 1: Run the Next.js scaffolder**

```bash
cd projects/cameron-yuan-dot-com
npx create-next-app@latest . --typescript --app --eslint --src-dir --import-alias "@/*" --no-tailwind --use-npm --yes
```

Expected: creates `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/{layout.tsx,page.tsx,globals.css}`, `public/`, `.gitignore` (merges with existing repo files — LICENSE/README/docs/.gitignore already present are untouched).

- [ ] **Step 2: Install the LangGraph + testing dependencies**

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 3: Add a Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Add a test script**

Modify `package.json` — add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 5: Add `.env.example`**

Create `.env.example`:

```
OPENROUTER_API_KEY=
```

- [ ] **Step 6: Verify the scaffold builds**

Run: `npm run build`
Expected: build succeeds (default Next.js starter page).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts .env.example .gitignore src public
git commit -m "chore: scaffold Next.js app with LangGraph.js and Vitest"
```

---

## Task 2: Resume data source

**Files:**
- Create: `src/data/resume.ts`
- Test: `src/test/resume-data.test.ts`

This is a straight TypeScript port of `projects/resume/current/resume-data.js`, trimmed to the fields the site actually reads (experience, projects, skills). It is the single source of truth for the Experience page and the graph's tool functions.

- [ ] **Step 1: Write the failing test**

Create `src/test/resume-data.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { RESUME_DATA } from "@/data/resume";

describe("RESUME_DATA", () => {
  it("has at least one experience entry with a company and roles", () => {
    expect(RESUME_DATA.experience.length).toBeGreaterThan(0);
    expect(RESUME_DATA.experience[0].company).toBe("Mastercard");
    expect(RESUME_DATA.experience[0].roles[0].bullets.length).toBeGreaterThan(0);
  });

  it("has at least one project entry", () => {
    expect(RESUME_DATA.projects.length).toBeGreaterThan(0);
  });

  it("has skill groups with items", () => {
    expect(RESUME_DATA.skills.length).toBeGreaterThan(0);
    expect(RESUME_DATA.skills[0].items.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- resume-data`
Expected: FAIL with "Cannot find module '@/data/resume'"

- [ ] **Step 3: Write the data file**

Create `src/data/resume.ts`:

```typescript
export interface ExperienceRole {
  title: string;
  period: string;
  bullets: string[];
}

export interface ExperienceEntry {
  company: string;
  roles: ExperienceRole[];
}

export interface ProjectEntry {
  name: string;
  period: string;
  bullets: string[];
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export const RESUME_DATA = {
  name: "Cameron Yuan",
  title: "Agentic AI & Platform Engineering",

  skills: [
    {
      label: "AI & Agents",
      items: ["Claude API", "LLM / RAG", "MCP (Model Context Protocol)", "Multi-Agent Systems", "Prompt Engineering", "Vector Databases", "LangChain", "LangGraph"],
    },
    {
      label: "Languages & Frameworks",
      items: ["Python", "TypeScript", "Java", "JavaScript", "React", "Next.js", "Angular", "Spring Boot", "Node.js"],
    },
    {
      label: "Data & Infrastructure",
      items: ["PostgreSQL", "MongoDB", "Oracle", "NoSQL", "Kafka", "SQL", "Kubernetes", "Docker", "Linux", "Bash"],
    },
    {
      label: "Practices & Tools",
      items: ["Hexagonal Architecture", "TDD", "BDD", "Agile", "CI/CD", "Git", "GitHub Enterprise"],
    },
  ] satisfies SkillGroup[],

  experience: [
    {
      company: "Mastercard",
      roles: [
        {
          title: "Senior Software Engineer — Smart Data",
          period: "Aug 2024 – Present",
          bullets: [
            "Built a production Generative AI multi-agent platform — LLM-powered hierarchical and mesh agent topologies, wave orchestration, and a shards-based graph orchestration engine with DAG-based dependency resolution and cross-session state resumption — adopted by 80+ engineers",
            "Engineered a Retrieval-Augmented Generation (RAG) memory system on PostgreSQL + pgvector with Jina embeddings — episodic, semantic, and procedural knowledge retrieval, plus a knowledge graph across 473 projects and 740 REST endpoints",
            "Conceived and delivered autonomous deployment automation for 190 microservices — 800+ deployments and 450+ auto-triggered rollbacks in 4 months",
            "Architected hexagonal architecture and execution-task pattern for migrating ~2M payment entities across TSYS1→TSYS2",
          ],
        },
      ],
    },
    {
      company: "Edward Jones",
      roles: [
        {
          title: "Senior Software Engineer – Client Online Access",
          period: "Jan 2022 – Aug 2024",
          bullets: [
            "Achieved $6M+ in annual savings by automating CI/CD deployment pipelines",
            "Led 7-engineer effort to deliver defense-in-depth login security across a 4M+ user platform",
            "Drove adoption of Hexagonal Architecture and TDD across a 200+ endpoint Java platform, raising code coverage from 70% to 100%",
          ],
        },
        {
          title: "Programmer Analyst II – Rotational Development Program",
          period: "Jun 2017 – Jan 2022",
          bullets: [
            "Championed migration from CVS to GitHub Enterprise — stood up full governance from scratch",
            "Completed Edward Jones' Rotational Development Program across six engineering teams in one year",
          ],
        },
      ],
    },
  ] satisfies ExperienceEntry[],

  projects: [
    {
      name: "Nucleus — Multi-Agent Coding Hub",
      period: "Mar 2026 – Present",
      bullets: [
        "Developed a production multi-agent coding hub coordinating specialist AI implementer, reviewer, and researcher agents across concurrent projects",
        "Agents operate in isolated git worktrees, run mandatory gate checks, and push to main only after a second reviewer agent approves",
      ],
    },
    {
      name: "AutoEtsy — Autonomous AI Shop Manager",
      period: "Mar 2026 – Present",
      bullets: [
        "Conceived a fully autonomous Etsy shop manager spanning a 7-agent pipeline (strategist, intelligence, producer, merchandiser, optimizer, actuator, triage)",
        "Introduced confidence-threshold guardrails that block agent mutations unless a decision score clears a tunable threshold",
      ],
    },
    {
      name: "Gaka — AI Manga Creation Platform",
      period: "Mar 2026 – Present",
      bullets: [
        "Created an AI manga platform where a Claude-powered interviewer enriches prompts with persistent context",
        "Routes through a multi-phase pipeline (sketch → background → color) via Fal.ai with user approval per stage",
      ],
    },
  ] satisfies ProjectEntry[],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- resume-data`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/data/resume.ts src/test/resume-data.test.ts
git commit -m "feat: add structured resume data as single source of truth"
```

---

## Task 3: Design system (peach palette)

**Files:**
- Modify: `src/app/globals.css`

Ports the "original peach" mockup's CSS (validated in the visual brainstorm) into the real app as reusable classes, plus CSS custom properties so the palette lives in one place.

- [ ] **Step 1: Replace the generated globals.css**

Replace the full contents of `src/app/globals.css`:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #fff7ed;
  --nav-bg: #fffaf3;
  --nav-border: #ffe4c2;
  --brand-accent: #ff8a3d;
  --text-1: #2a1a0f;
  --text-2: #6b4a2f;
  --text-3: #8a6a4a;
  --text-muted: #b08a5a;
  --accent: #ffb454;
  --accent-rgb: 255, 180, 84;
  --accent-hover: #ffa93d;
  --accent-strong: #b5651d;
  --card-bg: #ffffff;
  --pill-bg: #fff3e6;
  --pill-border: #ffe0b3;
  --user-msg-bg: #ffe9d1;
  --bot-border: #ffd9a8;
  --shadow-rgb: 150, 90, 20;
  --active-nav-bg: #ffe9d1;
  --node-done-bg: #f0faf0;
  --node-done-border: #7fbf7f;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text-1);
}

a { color: inherit; text-decoration: none; }

.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 44px; background: var(--nav-bg); border-bottom: 1px solid var(--nav-border);
  position: sticky; top: 0; z-index: 10;
}
.brand { font-weight: 800; font-size: 1.15rem; }
.brand span { color: var(--brand-accent); }
.navlinks { display: flex; gap: 6px; }
.navlinks a {
  font-weight: 600; font-size: .92rem; padding: 8px 16px; border-radius: 999px; color: var(--text-2);
}
.navlinks a.active { background: var(--active-nav-bg); color: var(--accent-strong); }
.navlinks a:hover { background: var(--pill-bg); }

.page { padding: 44px; max-width: 980px; margin: 0 auto; }

.hero { text-align: center; margin-bottom: 34px; }
.hero .wave { font-size: 2.3rem; font-weight: 800; }
.hero .role { margin-top: 8px; font-size: 1.1rem; color: var(--text-2); }
.hero .sub { margin-top: 10px; font-size: .95rem; color: var(--text-3); max-width: 520px; margin-left: auto; margin-right: auto; }

.card {
  background: var(--card-bg); border-radius: 22px; padding: 24px 28px; margin-bottom: 26px;
  box-shadow: 0 8px 28px rgba(var(--shadow-rgb), .08);
}
.label {
  font-size: .8rem; font-weight: 700; color: var(--accent-strong);
  text-transform: uppercase; letter-spacing: .04em; margin-bottom: 16px;
}

.fmsg-user {
  background: var(--user-msg-bg); display: inline-block; padding: 10px 16px;
  border-radius: 16px 16px 4px 16px; margin-bottom: 12px; font-size: .95rem; max-width: 80%;
}
.fmsg-bot {
  background: var(--pill-bg); border: 1px solid var(--bot-border); padding: 12px 16px;
  border-radius: 4px 16px 16px 16px; font-size: .92rem; line-height: 1.5; max-width: 90%;
}
.cite {
  display: inline-block; margin: 8px 6px 0 0; font-size: .72rem; background: var(--accent);
  color: var(--text-1); padding: 3px 10px; border-radius: 999px; font-weight: 600;
}

.chat-input-row { display: flex; gap: 10px; }
.chat-input {
  flex: 1; border: 2px solid var(--pill-border); border-radius: 999px; padding: 12px 18px;
  font: inherit; font-size: .95rem; background: var(--nav-bg); color: var(--text-1);
}
.chat-input:focus { outline: none; border-color: var(--accent); }
.chat-send {
  background: var(--accent); border: none; border-radius: 999px; padding: 0 22px;
  font-weight: 700; cursor: pointer; font-size: .9rem; color: var(--text-1);
}
.chat-send:hover { background: var(--accent-hover); }
.chat-send:disabled { opacity: .5; cursor: not-allowed; }

.suggestions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.suggestion {
  background: var(--pill-bg); border: 1px solid var(--pill-border); border-radius: 999px;
  padding: 6px 14px; font-size: .8rem; cursor: pointer; color: var(--accent-strong);
}
.suggestion:hover { background: var(--user-msg-bg); }

.graph-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; }
.specialists-row { display: flex; justify-content: center; gap: 10px; margin: 10px 0; flex-wrap: wrap; }
.fnode {
  background: var(--pill-bg); border-radius: 16px; padding: 14px 10px; font-size: .8rem;
  text-align: center; border: 2px solid transparent; width: 108px; transition: all .3s;
}
.fnode .fn-emoji { font-size: 1.3rem; }
.fnode .fn-title { font-weight: 700; margin-top: 4px; color: var(--text-1); }
.fnode .fn-state { font-size: .68rem; color: var(--text-muted); margin-top: 2px; height: 14px; }
.fnode.active {
  border-color: var(--accent); background: var(--user-msg-bg); transform: scale(1.06);
  box-shadow: 0 4px 14px rgba(var(--accent-rgb), .35);
}
.fnode.done { border-color: var(--node-done-border); background: var(--node-done-bg); }
.fnode.done .fn-state::before { content: '✓ '; color: #4caf50; }
.fnode.active .fn-state::before { content: '● '; color: var(--brand-accent); }
.farrow { color: var(--pill-border); font-size: 1.3rem; }
.fun-caption { margin-top: 14px; font-size: .85rem; color: var(--text-2); text-align: center; min-height: 20px; }

.grid-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
@media (max-width: 700px) { .grid-cards { grid-template-columns: 1fr; } }
.proj-card { background: var(--card-bg); border-radius: 20px; padding: 24px; box-shadow: 0 6px 20px rgba(var(--shadow-rgb), .07); }
.proj-card .p-emoji { font-size: 1.6rem; }
.proj-card h3 { margin: 10px 0 6px; font-size: 1.1rem; }
.proj-card .p-period { font-size: .75rem; color: var(--text-muted); margin-bottom: 10px; }
.proj-card p { font-size: .88rem; color: var(--text-2); line-height: 1.5; }
.proj-card .p-tags { margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap; }
.p-tag { background: var(--pill-bg); color: var(--accent-strong); font-size: .72rem; padding: 4px 10px; border-radius: 999px; font-weight: 600; }

.timeline { display: flex; flex-direction: column; gap: 18px; }
.tl-card { background: var(--card-bg); border-radius: 18px; padding: 22px 26px; box-shadow: 0 6px 20px rgba(var(--shadow-rgb), .07); position: relative; padding-left: 34px; }
.tl-card::before { content: ''; position: absolute; left: 14px; top: 26px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); }
.tl-card h3 { font-size: 1.05rem; }
.tl-card .tl-period { font-size: .78rem; color: var(--text-muted); margin: 2px 0 10px; }
.tl-card ul { margin-left: 18px; font-size: .87rem; color: var(--text-2); line-height: 1.6; }

.contact-card { background: var(--card-bg); border-radius: 22px; padding: 40px; text-align: center; box-shadow: 0 8px 28px rgba(var(--shadow-rgb), .08); }
.contact-links { display: flex; gap: 14px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }
.clink { background: var(--pill-bg); border: 1px solid var(--pill-border); padding: 10px 20px; border-radius: 999px; font-weight: 600; font-size: .9rem; color: var(--accent-strong); }
```

- [ ] **Step 2: Verify the app still builds**

Run: `npm run build`
Expected: build succeeds (page content still default from scaffold — styling has no consumers yet, that's fine, next tasks add them).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add peach design system stylesheet"
```

---

## Task 4: Shared layout + Nav

**Files:**
- Create: `src/components/Nav.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write Nav.tsx**

Create `src/components/Nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/experience", label: "Experience" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <div className="nav">
      <div className="brand">
        cameron<span>.yuan</span>
      </div>
      <div className="navlinks">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? "active" : ""}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Cameron Yuan — Agentic AI & Platform Engineering",
  description: "Portfolio site with a live LangGraph.js multi-agent demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the app builds and the nav renders**

Run: `npm run build`
Expected: build succeeds. Run `npm run dev`, visit `http://localhost:3000`, confirm the nav bar with 4 links appears and "Home" is highlighted.

- [ ] **Step 4: Commit**

```bash
git add src/components/Nav.tsx src/app/layout.tsx
git commit -m "feat: add shared nav and root layout"
```

---

## Task 5: LangGraph state shape

**Files:**
- Create: `src/lib/graph/state.ts`
- Test: `src/test/state.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/state.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { InterviewState } from "@/lib/graph/state";

describe("InterviewState", () => {
  it("has a default state with empty labels and answers", () => {
    const spec = InterviewState.spec;
    expect(spec.labels.default()).toEqual([]);
    expect(spec.answers.default()).toEqual({});
    expect(spec.citations.default()).toEqual([]);
    expect(spec.finalAnswer.default()).toBe("");
  });

  it("merges answers via the answers reducer instead of overwriting", () => {
    const spec = InterviewState.spec;
    const merged = spec.answers.reducer(
      { experience: { text: "a", source: "s1" } },
      { projects: { text: "b", source: "s2" } },
    );
    expect(merged).toEqual({
      experience: { text: "a", source: "s1" },
      projects: { text: "b", source: "s2" },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- state`
Expected: FAIL with "Cannot find module '@/lib/graph/state'"

- [ ] **Step 3: Write the state definition**

Create `src/lib/graph/state.ts`:

```typescript
import { Annotation } from "@langchain/langgraph";

export type SpecialistLabel = "experience" | "projects" | "skills";

export interface SpecialistAnswer {
  text: string;
  source: string;
}

export const InterviewState = Annotation.Root({
  question: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  labels: Annotation<SpecialistLabel[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  answers: Annotation<Record<string, SpecialistAnswer>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
  citations: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  finalAnswer: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
});

export type InterviewStateType = typeof InterviewState.State;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- state`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/graph/state.ts src/test/state.test.ts
git commit -m "feat: define LangGraph interview state shape"
```

---

## Task 6: Specialist tool functions

**Files:**
- Create: `src/lib/graph/tools.ts`
- Test: `src/test/tools.test.ts`

Pure functions (not LLM calls) that look up grounded facts from `RESUME_DATA`. These are what the specialist nodes call — grounding answers instead of letting the LLM hallucinate.

- [ ] **Step 1: Write the failing test**

Create `src/test/tools.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { experienceLookup, projectsLookup, skillsLookup } from "@/lib/graph/tools";

describe("experienceLookup", () => {
  it("returns bullets mentioning microservices with a source", () => {
    const result = experienceLookup("microservices");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].text.toLowerCase()).toContain("microservices");
    expect(result[0].source).toBe("Mastercard — Smart Data");
  });

  it("returns an empty array when nothing matches", () => {
    expect(experienceLookup("underwater basket weaving")).toEqual([]);
  });
});

describe("projectsLookup", () => {
  it("finds AutoEtsy when asked about Etsy or shop automation", () => {
    const result = projectsLookup("etsy shop");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].source).toBe("Project — AutoEtsy — Autonomous AI Shop Manager");
  });
});

describe("skillsLookup", () => {
  it("finds the AI & Agents skill group for a langgraph question", () => {
    const result = skillsLookup("langgraph");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].source).toBe("Skills — AI & Agents");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tools`
Expected: FAIL with "Cannot find module '@/lib/graph/tools'"

- [ ] **Step 3: Write the tool functions**

Create `src/lib/graph/tools.ts`:

```typescript
import { RESUME_DATA } from "@/data/resume";
import type { SpecialistAnswer } from "@/lib/graph/state";

function keywords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2);
}

function matchesAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

export function experienceLookup(query: string): SpecialistAnswer[] {
  const words = keywords(query);
  const results: SpecialistAnswer[] = [];
  for (const entry of RESUME_DATA.experience) {
    for (const role of entry.roles) {
      for (const bullet of role.bullets) {
        if (matchesAny(bullet, words)) {
          results.push({ text: bullet, source: `${entry.company} — ${role.title.split("—")[0].split("–")[0].trim()}` });
        }
      }
    }
  }
  return results;
}

export function projectsLookup(query: string): SpecialistAnswer[] {
  const words = keywords(query);
  const results: SpecialistAnswer[] = [];
  for (const project of RESUME_DATA.projects) {
    const haystack = `${project.name} ${project.bullets.join(" ")}`;
    if (matchesAny(haystack, words)) {
      results.push({
        text: project.bullets[0],
        source: `Project — ${project.name}`,
      });
    }
  }
  return results;
}

export function skillsLookup(query: string): SpecialistAnswer[] {
  const words = keywords(query);
  const results: SpecialistAnswer[] = [];
  for (const group of RESUME_DATA.skills) {
    const haystack = `${group.label} ${group.items.join(" ")}`;
    if (matchesAny(haystack, words)) {
      results.push({
        text: group.items.join(", "),
        source: `Skills — ${group.label}`,
      });
    }
  }
  return results;
}
```

Note: `experienceLookup`'s source derivation strips the em/en-dash suffix off role titles (e.g. "Senior Software Engineer — Smart Data" → "Smart Data" is dropped, company + first segment kept) to match the test's expected `"Mastercard — Smart Data"` — the role title in `resume.ts` is `"Senior Software Engineer — Smart Data"`, so `role.title.split("—")[0]` yields `"Senior Software Engineer "`, which is wrong. Fix by sourcing from company + a static per-entry label instead: see corrected version in Step 3b below.

- [ ] **Step 3b: Correct the source-label derivation**

Replace the `experienceLookup` function body in `src/lib/graph/tools.ts` with a version that reads an explicit `sourceLabel` rather than parsing the title string:

First, modify `src/data/resume.ts`'s `ExperienceRole` interface and Mastercard/Edward Jones entries to add a `sourceLabel` field:

```typescript
export interface ExperienceRole {
  title: string;
  period: string;
  bullets: string[];
  sourceLabel: string;
}
```

Add `sourceLabel: "Mastercard — Smart Data"` to the Mastercard role, `sourceLabel: "Edward Jones — Client Online Access"` to the first Edward Jones role, and `sourceLabel: "Edward Jones — Rotational Program"` to the second.

Then update `experienceLookup` in `src/lib/graph/tools.ts`:

```typescript
export function experienceLookup(query: string): SpecialistAnswer[] {
  const words = keywords(query);
  const results: SpecialistAnswer[] = [];
  for (const entry of RESUME_DATA.experience) {
    for (const role of entry.roles) {
      for (const bullet of role.bullets) {
        if (matchesAny(bullet, words)) {
          results.push({ text: bullet, source: role.sourceLabel });
        }
      }
    }
  }
  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tools`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/data/resume.ts src/lib/graph/tools.ts src/test/tools.test.ts
git commit -m "feat: add grounded lookup tools for specialist nodes"
```

---

## Task 7: OpenRouter model client

**Files:**
- Create: `src/lib/graph/model.ts`

A single shared `ChatOpenAI` instance configured for OpenRouter, so every node imports the same client instead of constructing its own (keeps the "swap provider = one config change" property from the spec).

- [ ] **Step 1: Write model.ts**

Create `src/lib/graph/model.ts`:

```typescript
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
```

Note: `createModel()` is a factory (not a module-level singleton) so tests can avoid calling it at all — nodes accept an injected model in their function signature (see Task 8), and only `build-graph.ts` (Task 10) calls `createModel()` for the real, non-test graph.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/graph/model.ts
git commit -m "feat: add OpenRouter-configured chat model factory"
```

---

## Task 8: Router node (multi-label classification)

**Files:**
- Create: `src/lib/graph/router-node.ts`
- Test: `src/test/router-node.test.ts`

Classifies the question into a subset of `experience | projects | skills` (never zero — `general` is represented by an empty label set, handled by the graph's conditional edges in Task 10, not by the router itself).

- [ ] **Step 1: Write the failing test**

Create `src/test/router-node.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { classifyQuestion } from "@/lib/graph/router-node";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function fakeModel(response: string): BaseChatModel {
  return {
    invoke: vi.fn().mockResolvedValue({ content: response }),
  } as unknown as BaseChatModel;
}

describe("classifyQuestion", () => {
  it("parses a single-label JSON response", async () => {
    const model = fakeModel('{"labels": ["skills"]}');
    const labels = await classifyQuestion(model, "What AI skills do you have?");
    expect(labels).toEqual(["skills"]);
  });

  it("parses a multi-label JSON response for a cross-cutting question", async () => {
    const model = fakeModel('{"labels": ["experience", "projects"]}');
    const labels = await classifyQuestion(model, "Have you worked with microservices?");
    expect(labels).toEqual(["experience", "projects"]);
  });

  it("falls back to an empty array (general) on unparseable output", async () => {
    const model = fakeModel("sorry, I don't understand the format");
    const labels = await classifyQuestion(model, "what's your favorite color?");
    expect(labels).toEqual([]);
  });

  it("drops labels outside the known set", async () => {
    const model = fakeModel('{"labels": ["experience", "weather"]}');
    const labels = await classifyQuestion(model, "anything");
    expect(labels).toEqual(["experience"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- router-node`
Expected: FAIL with "Cannot find module '@/lib/graph/router-node'"

- [ ] **Step 3: Write the router node**

Create `src/lib/graph/router-node.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- router-node`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/graph/router-node.ts src/test/router-node.test.ts
git commit -m "feat: add multi-label router node for the interview graph"
```

---

## Task 9: Specialist + General nodes

**Files:**
- Create: `src/lib/graph/specialist-nodes.ts`
- Test: `src/test/specialist-nodes.test.ts`

Each specialist node calls its matching tool, then asks the model to phrase a short answer from the returned facts (still grounded — the model may only rephrase, not invent). The General node needs no model call at all.

- [ ] **Step 1: Write the failing test**

Create `src/test/specialist-nodes.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import {
  runExperienceAgent,
  runProjectsAgent,
  runSkillsAgent,
  runGeneralAgent,
} from "@/lib/graph/specialist-nodes";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function fakeModel(response: string): BaseChatModel {
  return {
    invoke: vi.fn().mockResolvedValue({ content: response }),
  } as unknown as BaseChatModel;
}

describe("runExperienceAgent", () => {
  it("returns a phrased answer with a source citation", async () => {
    const model = fakeModel("Yes, extensively — 190 microservices at Mastercard.");
    const result = await runExperienceAgent(model, "Have you worked with microservices?");
    expect(result?.text).toContain("microservices");
    expect(result?.source).toBe("Mastercard — Smart Data");
  });

  it("returns undefined when the tool finds no matching facts", async () => {
    const model = fakeModel("irrelevant");
    const result = await runExperienceAgent(model, "underwater basket weaving");
    expect(result).toBeUndefined();
  });
});

describe("runProjectsAgent", () => {
  it("returns a phrased answer citing the matching project", async () => {
    const model = fakeModel("AutoEtsy is a 7-agent pipeline that runs an Etsy shop end-to-end.");
    const result = await runProjectsAgent(model, "tell me about your etsy shop project");
    expect(result?.source).toBe("Project — AutoEtsy — Autonomous AI Shop Manager");
  });
});

describe("runSkillsAgent", () => {
  it("returns a phrased answer citing the AI & Agents skill group", async () => {
    const model = fakeModel("Claude API, LangChain, LangGraph, and RAG pipelines.");
    const result = await runSkillsAgent(model, "what ai skills do you have");
    expect(result?.source).toBe("Skills — AI & Agents");
  });
});

describe("runGeneralAgent", () => {
  it("returns a static redirect without calling the model", async () => {
    const model = fakeModel("should not be used");
    const result = await runGeneralAgent();
    expect(result.text).toContain("experience, projects, or skills");
    expect(model.invoke).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- specialist-nodes`
Expected: FAIL with "Cannot find module '@/lib/graph/specialist-nodes'"

- [ ] **Step 3: Write the specialist nodes**

Create `src/lib/graph/specialist-nodes.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- specialist-nodes`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/graph/specialist-nodes.ts src/test/specialist-nodes.test.ts
git commit -m "feat: add specialist and general agent nodes"
```

---

## Task 10: Synthesizer node

**Files:**
- Create: `src/lib/graph/synthesizer-node.ts`
- Test: `src/test/synthesizer-node.test.ts`

Merges 1+ specialist answers into a single response. Per the spec, when only one specialist answered, this is a pass-through (no LLM call, no visible "merge" step) — the LLM merge only happens for genuinely multi-source answers.

- [ ] **Step 1: Write the failing test**

Create `src/test/synthesizer-node.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { synthesize } from "@/lib/graph/synthesizer-node";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { SpecialistAnswer } from "@/lib/graph/state";

function fakeModel(response: string): BaseChatModel {
  return {
    invoke: vi.fn().mockResolvedValue({ content: response }),
  } as unknown as BaseChatModel;
}

describe("synthesize", () => {
  it("passes a single answer through without calling the model", async () => {
    const model = fakeModel("should not be used");
    const answers: Record<string, SpecialistAnswer> = {
      skills: { text: "Claude API, LangGraph.", source: "Skills — AI & Agents" },
    };
    const result = await synthesize(model, answers);
    expect(result.finalAnswer).toBe("Claude API, LangGraph.");
    expect(result.citations).toEqual(["Skills — AI & Agents"]);
    expect(model.invoke).not.toHaveBeenCalled();
  });

  it("merges multiple answers via the model and collects all citations", async () => {
    const model = fakeModel("Yes — 190 microservices at Mastercard, and Nucleus is itself multi-agent.");
    const answers: Record<string, SpecialistAnswer> = {
      experience: { text: "190 microservices at Mastercard.", source: "Mastercard — Smart Data" },
      projects: { text: "Nucleus coordinates agents via git worktrees.", source: "Project — Nucleus" },
    };
    const result = await synthesize(model, answers);
    expect(result.finalAnswer).toContain("Mastercard");
    expect(result.citations).toEqual(["Mastercard — Smart Data", "Project — Nucleus"]);
    expect(model.invoke).toHaveBeenCalledOnce();
  });

  it("returns the general fallback text when there are no answers", async () => {
    const model = fakeModel("should not be used");
    const result = await synthesize(model, {});
    expect(result.finalAnswer).toContain("experience, projects, or skills");
    expect(result.citations).toEqual([]);
    expect(model.invoke).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- synthesizer-node`
Expected: FAIL with "Cannot find module '@/lib/graph/synthesizer-node'"

- [ ] **Step 3: Write the synthesizer**

Create `src/lib/graph/synthesizer-node.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- synthesizer-node`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/graph/synthesizer-node.ts src/test/synthesizer-node.test.ts
git commit -m "feat: add synthesizer node with single-answer passthrough"
```

---

## Task 11: Graph assembly (fan-out/join wiring)

**Files:**
- Create: `src/lib/graph/build-graph.ts`
- Test: `src/test/build-graph.test.ts`

Wires Router → parallel specialists (only the matched ones, via `addConditionalEdges` returning multiple target names) → Synthesizer, using `@langchain/langgraph`'s `StateGraph`. Accepts an injected model so tests never make network calls.

- [ ] **Step 1: Write the failing test**

Create `src/test/build-graph.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { buildInterviewGraph } from "@/lib/graph/build-graph";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function sequencedModel(responses: string[]): BaseChatModel {
  let call = 0;
  return {
    invoke: vi.fn().mockImplementation(async () => ({ content: responses[call++] })),
  } as unknown as BaseChatModel;
}

describe("buildInterviewGraph", () => {
  it("runs the single-label path end to end", async () => {
    const model = sequencedModel([
      '{"labels": ["skills"]}', // router
      "Claude API, LangChain, LangGraph.", // skills agent phrasing
      // synthesizer not called for single-answer path
    ]);
    const graph = buildInterviewGraph(model);
    const result = await graph.invoke({ question: "what ai skills do you have?" });
    expect(result.finalAnswer).toContain("Claude");
    expect(result.citations).toEqual(["Skills — AI & Agents"]);
  });

  it("runs the multi-label fan-out/join path end to end", async () => {
    const model = sequencedModel([
      '{"labels": ["experience", "projects"]}', // router
      "190 microservices at Mastercard.", // experience agent phrasing
      "Nucleus coordinates agents via git worktrees.", // projects agent phrasing
      "Yes — 190 microservices at Mastercard, and Nucleus is itself multi-agent.", // synthesizer merge
    ]);
    const graph = buildInterviewGraph(model);
    const result = await graph.invoke({ question: "have you worked with microservices?" });
    expect(result.finalAnswer).toContain("Mastercard");
    expect(result.citations).toEqual(
      expect.arrayContaining(["Mastercard — Smart Data", "Project — Nucleus"]),
    );
  });

  it("runs the general fallback path when the router returns no labels", async () => {
    const model = sequencedModel(['{"labels": []}']);
    const graph = buildInterviewGraph(model);
    const result = await graph.invoke({ question: "what's the weather like?" });
    expect(result.finalAnswer).toContain("experience, projects, or skills");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- build-graph`
Expected: FAIL with "Cannot find module '@/lib/graph/build-graph'"

- [ ] **Step 3: Write the graph assembly**

Create `src/lib/graph/build-graph.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- build-graph`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/graph/build-graph.ts src/test/build-graph.test.ts
git commit -m "feat: assemble interview graph with fan-out/join routing"
```

---

## Task 12: Rate limiting

**Files:**
- Create: `src/lib/rate-limit.ts`
- Test: `src/test/rate-limit.test.ts`

Simple in-memory per-IP sliding window. Good enough for a low-traffic personal site (Vercel serverless functions are ephemeral, so this resets on cold start — acceptable per the spec, which calls for "basic" limiting, not a durable store).

- [ ] **Step 1: Write the failing test**

Create `src/test/rate-limit.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  it("allows the first N requests within the window", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("1.2.3.4", 5, 60_000)).toBe(true);
    }
  });

  it("blocks the (N+1)th request within the window", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("1.2.3.4", 5, 60_000);
    expect(checkRateLimit("1.2.3.4", 5, 60_000)).toBe(false);
  });

  it("resets after the window elapses", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("1.2.3.4", 5, 60_000);
    vi.setSystemTime(60_001);
    expect(checkRateLimit("1.2.3.4", 5, 60_000)).toBe(true);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("1.2.3.4", 5, 60_000);
    expect(checkRateLimit("5.6.7.8", 5, 60_000)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- rate-limit`
Expected: FAIL with "Cannot find module '@/lib/rate-limit'"

- [ ] **Step 3: Write the rate limiter**

Create `src/lib/rate-limit.ts`:

```typescript
const requestLog = new Map<string, number[]>();

export function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    requestLog.set(ip, timestamps);
    return false;
  }

  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- rate-limit`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts src/test/rate-limit.test.ts
git commit -m "feat: add in-memory per-IP rate limiter"
```

---

## Task 13: `/api/interview` route

**Files:**
- Create: `src/app/api/interview/route.ts`
- Test: `src/test/interview-route.test.ts`

Streams newline-delimited JSON events (`{type: "node", name: "router", status: "active"}`, then `"done"` per node, then a final `{type: "result", finalAnswer, citations}`) so the frontend can drive the pipeline animation from real graph execution, not a canned timer.

- [ ] **Step 1: Write the failing test**

Create `src/test/interview-route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/graph/model", () => ({
  createModel: vi.fn(),
}));

vi.mock("@/lib/graph/build-graph", () => ({
  buildInterviewGraph: vi.fn(() => ({
    streamEvents: vi.fn().mockImplementation(async function* () {
      yield { event: "on_chain_start", name: "router", data: {} };
      yield { event: "on_chain_end", name: "router", data: {} };
      yield { event: "on_chain_start", name: "skillsAgent", data: {} };
      yield { event: "on_chain_end", name: "skillsAgent", data: {} };
      yield {
        event: "on_chain_end",
        name: "synthesizer",
        data: { output: { finalAnswer: "Claude API and LangGraph.", citations: ["Skills — AI & Agents"] } },
      };
    }),
  })),
}));

import { POST } from "@/app/api/interview/route";

describe("POST /api/interview", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  it("streams node events and a final result", async () => {
    const req = new Request("http://localhost/api/interview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "what ai skills do you have?" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const text = await res.text();
    const lines = text.trim().split("\n").map((l) => JSON.parse(l));

    expect(lines.some((l) => l.type === "node" && l.name === "router")).toBe(true);
    expect(lines.some((l) => l.type === "result" && l.finalAnswer.includes("Claude"))).toBe(true);
  });

  it("returns 400 when question is missing", async () => {
    const req = new Request("http://localhost/api/interview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- interview-route`
Expected: FAIL with "Cannot find module '@/app/api/interview/route'"

- [ ] **Step 3: Write the route**

Create `src/app/api/interview/route.ts`:

```typescript
import { createModel } from "@/lib/graph/model";
import { buildInterviewGraph } from "@/lib/graph/build-graph";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const GRAPH_NODE_NAMES = new Set(["router", "experienceAgent", "projectsAgent", "skillsAgent", "synthesizer"]);

export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 20, 60_000)) {
    return new Response(JSON.stringify({ error: "rate limited" }), { status: 429 });
  }

  let question: string | undefined;
  try {
    const body = (await req.json()) as { question?: string };
    question = body.question;
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }

  if (!question || typeof question !== "string") {
    return new Response(JSON.stringify({ error: "question is required" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      }

      try {
        const model = createModel();
        const graph = buildInterviewGraph(model);

        for await (const event of graph.streamEvents(
          { question },
          { version: "v2" },
        )) {
          if (!GRAPH_NODE_NAMES.has(event.name)) continue;

          if (event.event === "on_chain_start") {
            send({ type: "node", name: event.name, status: "active" });
          } else if (event.event === "on_chain_end") {
            send({ type: "node", name: event.name, status: "done" });
            if (event.name === "synthesizer") {
              const output = event.data.output as { finalAnswer: string; citations: string[] };
              send({ type: "result", finalAnswer: output.finalAnswer, citations: output.citations });
            }
          }
        }
      } catch {
        send({
          type: "error",
          message: "my agent's a little overloaded — try again in a moment",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "content-type": "application/x-ndjson" },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- interview-route`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/interview/route.ts src/test/interview-route.test.ts
git commit -m "feat: add streaming /api/interview route with rate limiting and error fallback"
```

---

## Task 14: PipelineViz component

**Files:**
- Create: `src/components/PipelineViz.tsx`

Renders the node graph and exposes an imperative `applyEvent` handler the chat panel calls per streamed NDJSON line. Pure presentational state (idle/active/done per node) — no networking of its own.

- [ ] **Step 1: Write PipelineViz.tsx**

Create `src/components/PipelineViz.tsx`:

```tsx
"use client";

import { useState, useImperativeHandle, forwardRef } from "react";

type NodeStatus = "idle" | "active" | "done";
type NodeId = "router" | "experienceAgent" | "projectsAgent" | "skillsAgent" | "synthesizer";

const NODE_META: Record<NodeId, { emoji: string; title: string }> = {
  router: { emoji: "🧭", title: "Router" },
  experienceAgent: { emoji: "💼", title: "Experience" },
  projectsAgent: { emoji: "🚀", title: "Projects" },
  skillsAgent: { emoji: "🛠️", title: "Skills" },
  synthesizer: { emoji: "🧵", title: "Synthesizer" },
};

export interface PipelineVizHandle {
  applyEvent: (event: { name: string; status: "active" | "done" }) => void;
  reset: () => void;
}

function Node({ id, status }: { id: NodeId; status: NodeStatus }) {
  const meta = NODE_META[id];
  return (
    <div className={`fnode ${status}`}>
      <div className="fn-emoji">{meta.emoji}</div>
      <div className="fn-title">{meta.title}</div>
      <div className="fn-state" />
    </div>
  );
}

export const PipelineViz = forwardRef<PipelineVizHandle>(function PipelineViz(_props, ref) {
  const [statuses, setStatuses] = useState<Record<NodeId, NodeStatus>>({
    router: "idle",
    experienceAgent: "idle",
    projectsAgent: "idle",
    skillsAgent: "idle",
    synthesizer: "idle",
  });

  useImperativeHandle(ref, () => ({
    applyEvent(event) {
      if (!(event.name in NODE_META)) return;
      setStatuses((prev) => ({ ...prev, [event.name]: event.status }));
    },
    reset() {
      setStatuses({
        router: "idle",
        experienceAgent: "idle",
        projectsAgent: "idle",
        skillsAgent: "idle",
        synthesizer: "idle",
      });
    },
  }));

  return (
    <div className="card">
      <div className="label">live pipeline</div>
      <div className="graph-row">
        <Node id="router" status={statuses.router} />
      </div>
      <div className="specialists-row">
        <Node id="experienceAgent" status={statuses.experienceAgent} />
        <Node id="projectsAgent" status={statuses.projectsAgent} />
        <Node id="skillsAgent" status={statuses.skillsAgent} />
      </div>
      <div className="graph-row">
        <Node id="synthesizer" status={statuses.synthesizer} />
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (component has no consumer yet — added in Task 15).

- [ ] **Step 3: Commit**

```bash
git add src/components/PipelineViz.tsx
git commit -m "feat: add PipelineViz presentational component"
```

---

## Task 15: ChatPanel component + Home page wiring

**Files:**
- Create: `src/components/ChatPanel.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write ChatPanel.tsx**

Create `src/components/ChatPanel.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { PipelineViz, type PipelineVizHandle } from "@/components/PipelineViz";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  citations?: string[];
}

const SUGGESTIONS = [
  "Have you worked with microservices?",
  "What AI skills do you have?",
  "Tell me about a project you built",
];

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const vizRef = useRef<PipelineVizHandle>(null);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    vizRef.current?.reset();

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.body) throw new Error("no response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "node") {
            vizRef.current?.applyEvent(event);
          } else if (event.type === "result") {
            setMessages((prev) => [
              ...prev,
              { role: "bot", text: event.finalAnswer, citations: event.citations },
            ]);
          } else if (event.type === "error") {
            setMessages((prev) => [...prev, { role: "bot", text: event.message }]);
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "my agent's a little overloaded — try again in a moment" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="chat-log">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="fmsg-user">{m.text}</div>
            ) : (
              <div key={i} className="fmsg-bot">
                {m.text}
                <div>
                  {m.citations?.map((c) => (
                    <span key={c} className="cite">🔗 {c}</span>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
        <div className="chat-input-row">
          <input
            className="chat-input"
            value={input}
            placeholder="e.g. Have you worked with microservices?"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
          />
          <button className="chat-send" onClick={() => ask(input)} disabled={busy}>
            Ask →
          </button>
        </div>
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <div key={s} className="suggestion" onClick={() => ask(s)}>
              {s}
            </div>
          ))}
        </div>
      </div>
      <PipelineViz ref={vizRef} />
    </>
  );
}
```

- [ ] **Step 2: Wire it into the Home page**

Replace `src/app/page.tsx`:

```tsx
import { ChatPanel } from "@/components/ChatPanel";

export default function HomePage() {
  return (
    <div className="page">
      <div className="hero">
        <div className="wave">👋 hey, I&apos;m Cameron</div>
        <div className="role">I build AI agents that ship real software</div>
        <div className="sub">
          Ask my agent anything about my experience, projects, or skills — it&apos;s a real
          LangGraph pipeline, not a script.
        </div>
      </div>
      <ChatPanel />
    </div>
  );
}
```

- [ ] **Step 3: Manual verification in a real browser**

Run: `npm run dev`, set a real `OPENROUTER_API_KEY` in `.env.local`, visit `http://localhost:3000`.
Click each suggestion and confirm: the Router node lights up, then the correct specialist node(s), then Synthesizer (or skips it for single-source answers per Task 10's design), and the answer + citation pill(s) render. This is the manual check called for in the spec's Testing section — no automated test covers the animation itself.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChatPanel.tsx src/app/page.tsx
git commit -m "feat: wire ChatPanel and PipelineViz into the Home page"
```

---

## Task 16: Projects page

**Files:**
- Create: `src/app/projects/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/projects/page.tsx`:

```tsx
import { RESUME_DATA } from "@/data/resume";

const PROJECT_META: Record<string, { emoji: string; tags: string[] }> = {
  "Nucleus — Multi-Agent Coding Hub": { emoji: "🧠", tags: ["Multi-agent", "Dev tooling"] },
  "AutoEtsy — Autonomous AI Shop Manager": { emoji: "🛍️", tags: ["Agent pipeline", "Automation"] },
  "Gaka — AI Manga Creation Platform": { emoji: "🎨", tags: ["Creative AI", "Pipelines"] },
};

export default function ProjectsPage() {
  return (
    <div className="page">
      <h2 style={{ marginBottom: 20 }}>Projects</h2>
      <div className="grid-cards">
        {RESUME_DATA.projects.map((project) => {
          const meta = PROJECT_META[project.name] ?? { emoji: "📦", tags: [] };
          return (
            <div key={project.name} className="proj-card">
              <div className="p-emoji">{meta.emoji}</div>
              <h3>{project.name}</h3>
              <div className="p-period">{project.period}</div>
              <p>{project.bullets[0]}</p>
              <div className="p-tags">
                {meta.tags.map((tag) => (
                  <span key={tag} className="p-tag">{tag}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run: `npm run dev`, visit `http://localhost:3000/projects`, confirm 3 project cards render (Nucleus, AutoEtsy, Gaka).

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/page.tsx
git commit -m "feat: add Projects page reading from resume data"
```

---

## Task 17: Experience page

**Files:**
- Create: `src/app/experience/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/experience/page.tsx`:

```tsx
import { RESUME_DATA } from "@/data/resume";

export default function ExperiencePage() {
  return (
    <div className="page">
      <h2 style={{ marginBottom: 20 }}>Experience</h2>
      <div className="timeline">
        {RESUME_DATA.experience.flatMap((entry) =>
          entry.roles.map((role) => (
            <div key={role.sourceLabel} className="tl-card">
              <h3>{role.title}, {entry.company}</h3>
              <div className="tl-period">{role.period}</div>
              <ul>
                {role.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          )),
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run: `npm run dev`, visit `http://localhost:3000/experience`, confirm 3 role cards render (Mastercard, Edward Jones x2).

- [ ] **Step 3: Commit**

```bash
git add src/app/experience/page.tsx
git commit -m "feat: add Experience page reading from resume data"
```

---

## Task 18: Contact page

**Files:**
- Create: `src/app/contact/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/contact/page.tsx`:

```tsx
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="page">
      <h2 style={{ marginBottom: 20 }}>Contact</h2>
      <div className="contact-card">
        <div className="wave" style={{ fontSize: "1.6rem" }}>Let&apos;s talk 👋</div>
        <p style={{ marginTop: 10, color: "var(--text-2)" }}>
          Still curious? <Link href="/">Go back and ask my agent something</Link>, or reach me
          directly:
        </p>
        <div className="contact-links">
          <a className="clink" href="mailto:cameronmyuan@gmail.com">✉️ cameronmyuan@gmail.com</a>
          <a className="clink" href="https://linkedin.com/in/cameron-yuan" target="_blank" rel="noreferrer">
            💼 linkedin.com/in/cameron-yuan
          </a>
          <a className="clink" href="https://github.com/CamYuan" target="_blank" rel="noreferrer">
            🐙 github.com/CamYuan
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run: `npm run dev`, visit `http://localhost:3000/contact`, confirm the three contact links render and are clickable.

- [ ] **Step 3: Commit**

```bash
git add src/app/contact/page.tsx
git commit -m "feat: add Contact page"
```

---

## Task 19: Deployment configuration

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the deploy + env var setup**

Replace `README.md`:

```markdown
# cameron-yuan-dot-com

Personal portfolio site. Built with Next.js (App Router) + TypeScript. The homepage's
"interview my agent" demo is a real LangGraph.js `StateGraph` (Router → parallel
Experience/Projects/Skills specialists → Synthesizer) backed by OpenRouter's free tier.

## Local development

```bash
npm install
cp .env.example .env.local   # then set OPENROUTER_API_KEY
npm run dev
```

## Testing

```bash
npm run test
```

## Deployment

Deployed on Vercel, connected to this repo's `main` branch (auto-deploy on push).

Required environment variable in the Vercel project settings:

- `OPENROUTER_API_KEY` — an OpenRouter API key (free tier). Get one at
  https://openrouter.ai/keys. Never commit this key — it is read only from the
  environment (see `src/lib/graph/model.ts`).
```

- [ ] **Step 2: Run the full test suite one final time**

Run: `npm run test`
Expected: all tests across all 8 test files pass.

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document local dev, testing, and Vercel deployment"
```

---

## Self-Review

**Spec coverage:**
- Architecture (Next.js/Vercel, TypeScript, provider-swap interface) — Tasks 1, 7, 19 ✓
- Router multi-label classification — Task 8 ✓
- Specialist nodes with grounded tools — Tasks 6, 9 ✓
- General fallback path — Task 9 (`runGeneralAgent`), wired via empty-labels conditional edge in Task 11 ✓
- Synthesizer with single-answer skip — Task 10 ✓
- Frontend node animation driven by streamed events — Tasks 13, 14, 15 ✓
- Error handling / fallback message — Task 13 (`catch` → `type: "error"` event → Task 15 renders it as a bot message) ✓
- Rate limiting — Task 12, wired into Task 13 ✓
- Testing (unit + integration, no LLM calls in CI) — every task from 2–13 includes Vitest coverage with mocked models ✓
- Manual animation check — Task 15 Step 3 ✓
- Projects/Experience/Contact pages, one source of truth — Tasks 16–18, all read `RESUME_DATA` ✓
- Deployment — Task 19 ✓

**Placeholder scan:** none found — every step has complete, runnable code; the one ambiguity caught during drafting (Task 6's initial `experienceLookup` source-string parsing) was corrected inline in Step 3b rather than left as a TODO.

**Type consistency:** `SpecialistAnswer { text, source }` (Task 5) is used identically by `tools.ts` (Task 6), `specialist-nodes.ts` (Task 9), and `synthesizer-node.ts` (Task 10). `SpecialistLabel` (Task 5) matches the literal strings used in `router-node.ts` (Task 8) and the `NODE_NAMES` map in `build-graph.ts` (Task 11). The NDJSON event shape (`{type, name, status}` / `{type: "result", finalAnswer, citations}` / `{type: "error", message}`) is produced once in Task 13 and consumed identically in Task 15 — no drift between producer and consumer.

**Out of scope (per spec):** no separate microservice architecture was introduced — the whole app is one Next.js deployment, consistent with the spec's explicit scope note.
