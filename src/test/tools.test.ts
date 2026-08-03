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
