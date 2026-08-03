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
          results.push({ text: bullet, source: role.sourceLabel });
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
