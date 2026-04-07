import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") ?? "/app";
  const supabase = await createSupabaseServerClient();

  if (code && supabase) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  redirect(nextPath);
}
