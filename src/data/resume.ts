export interface ExperienceRole {
  title: string;
  period: string;
  bullets: string[];
  sourceLabel: string;
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
          sourceLabel: "Mastercard — Smart Data",
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
          sourceLabel: "Edward Jones — Client Online Access",
          bullets: [
            "Achieved $6M+ in annual savings by automating CI/CD deployment pipelines",
            "Led 7-engineer effort to deliver defense-in-depth login security across a 4M+ user platform",
            "Drove adoption of Hexagonal Architecture and TDD across a 200+ endpoint Java platform, raising code coverage from 70% to 100%",
          ],
        },
        {
          title: "Programmer Analyst II – Rotational Development Program",
          period: "Jun 2017 – Jan 2022",
          sourceLabel: "Edward Jones — Rotational Program",
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
