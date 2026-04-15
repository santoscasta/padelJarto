import { z } from 'zod';

// Required everywhere (auth, SSR pages, etc.).
// Optional vars are only needed by specific code paths (admin client,
// notifications, rate limiting) and validated at call site instead.
// Requiring them globally would crash unrelated routes like /auth/callback
// on deployments that don't configure the optional subsystems yet.
const ServerEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_ENABLE_DEMO_MODE: z.enum(['true', 'false']).optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Missing or invalid env vars: ${missing}`);
  }
  return parsed.data;
}

export const PublicEnvSchema = ServerEnvSchema.pick({
  NEXT_PUBLIC_APP_URL: true,
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_ENABLE_DEMO_MODE: true,
});
export type PublicEnv = z.infer<typeof PublicEnvSchema>;
