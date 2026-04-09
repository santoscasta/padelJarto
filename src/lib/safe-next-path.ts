const DEFAULT_FALLBACK_PATH = "/app";

function isSafeInternalPath(candidate: string) {
  if (!candidate.startsWith("/")) {
    return false;
  }

  if (candidate.startsWith("//")) {
    return false;
  }

  if (candidate.includes("\\") || candidate.includes("\u0000")) {
    return false;
  }

  try {
    const url = new URL(candidate, "http://padeljarto.local");
    return url.origin === "http://padeljarto.local" && url.pathname.startsWith("/");
  } catch {
    return false;
  }
}

export function sanitizeNextPath(value: string | null | undefined, fallback = DEFAULT_FALLBACK_PATH) {
  const candidate = value?.trim();
  if (!candidate) {
    return fallback;
  }

  return isSafeInternalPath(candidate) ? candidate : fallback;
}
