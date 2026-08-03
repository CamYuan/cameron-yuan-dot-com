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
