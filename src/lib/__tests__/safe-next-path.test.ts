import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/lib/safe-next-path";

describe("sanitizeNextPath", () => {
  it("returns the fallback when next is missing", () => {
    expect(sanitizeNextPath(undefined)).toBe("/app");
    expect(sanitizeNextPath(null, "/login")).toBe("/login");
  });

  it("keeps safe internal paths including query and hash", () => {
    expect(sanitizeNextPath("/app")).toBe("/app");
    expect(sanitizeNextPath("/app/tournaments?tab=matches#score")).toBe(
      "/app/tournaments?tab=matches#score",
    );
  });

  it("rejects external or malformed redirect targets", () => {
    expect(sanitizeNextPath("https://evil.example")).toBe("/app");
    expect(sanitizeNextPath("//evil.example")).toBe("/app");
    expect(sanitizeNextPath("/\\evil")).toBe("/app");
    expect(sanitizeNextPath("/app\u0000evil")).toBe("/app");
  });
});
