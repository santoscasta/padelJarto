import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getAppUrl", () => {
  it("prefers NEXT_PUBLIC_APP_URL when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://padeljarto.app/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "padeljarto.vercel.app");

    const { getAppUrl } = await import("@/lib/env");

    expect(getAppUrl()).toBe("https://padeljarto.app");
  });

  it("falls back to the Vercel production URL", async () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "padeljarto.vercel.app");

    const { getAppUrl } = await import("@/lib/env");

    expect(getAppUrl()).toBe("https://padeljarto.vercel.app");
  });

  it("falls back to the deployment URL when only VERCEL_URL is present", async () => {
    vi.stubEnv("VERCEL_URL", "padeljarto-git-main-example.vercel.app");

    const { getAppUrl } = await import("@/lib/env");

    expect(getAppUrl()).toBe("https://padeljarto-git-main-example.vercel.app");
  });

  it("uses localhost only when no public or Vercel URL is available", async () => {
    const { getAppUrl } = await import("@/lib/env");

    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
