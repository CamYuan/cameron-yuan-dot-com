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
