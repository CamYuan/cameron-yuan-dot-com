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
