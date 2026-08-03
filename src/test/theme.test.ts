import { describe, expect, it } from "vitest";
import { resolveInitialTheme } from "@/lib/theme";

describe("resolveInitialTheme", () => {
  it("uses the stored theme when valid", () => {
    expect(resolveInitialTheme("dark", false)).toBe("dark");
    expect(resolveInitialTheme("light", true)).toBe("light");
  });

  it("falls back to system preference when nothing is stored", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
  });

  it("falls back to system preference on an invalid stored value", () => {
    expect(resolveInitialTheme("blue", true)).toBe("dark");
    expect(resolveInitialTheme("blue", false)).toBe("light");
  });
});
