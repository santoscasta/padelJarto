const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const demoModeOverride = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE;
const vercelProjectProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const vercelUrl = process.env.VERCEL_URL;

export const env = {
  appUrl,
  publicSupabaseAnonKey,
  publicSupabaseUrl,
  supabaseServiceRoleKey,
};

export const hasSupabaseAuth = Boolean(publicSupabaseUrl && publicSupabaseAnonKey);
export const hasSupabaseData = Boolean(
  publicSupabaseUrl && publicSupabaseAnonKey && supabaseServiceRoleKey,
);
export const isDemoEnabled =
  demoModeOverride === "true" ||
  (demoModeOverride !== "false" && process.env.NODE_ENV !== "production");
export const isDemoMode = isDemoEnabled && !hasSupabaseData;

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim().replace(/\/+$/, "");

  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

export function getAppUrl() {
  if (appUrl) {
    return normalizeUrl(appUrl);
  }

  if (vercelProjectProductionUrl) {
    return normalizeUrl(vercelProjectProductionUrl);
  }

  if (vercelUrl) {
    return normalizeUrl(vercelUrl);
  }

  return "http://localhost:3000";
}
