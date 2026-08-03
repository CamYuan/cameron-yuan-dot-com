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
