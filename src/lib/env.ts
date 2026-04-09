const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const demoModeOverride = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE;

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

export function getAppUrl() {
  return appUrl ?? "http://localhost:3000";
}
