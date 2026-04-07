"use client";

import { startTransition, useState } from "react";
import { Apple, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function OAuthButtons({
  nextPath = "/app",
}: Readonly<{
  nextPath?: string;
}>) {
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);

  const signIn = (provider: "google" | "apple") => {
    startTransition(async () => {
      setError(null);
      setPendingProvider(provider);
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setError("Faltan las variables públicas de Supabase.");
        setPendingProvider(null);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
        provider,
      });

      if (signInError) {
        setError(signInError.message);
        setPendingProvider(null);
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
      }
    });
  };

  return (
    <div className="space-y-3">
      <Button
        className="w-full justify-start gap-3 rounded-2xl"
        onClick={() => signIn("google")}
        type="button"
        variant="secondary"
      >
        <Globe className="size-4" />
        {pendingProvider === "google" ? "Conectando con Google..." : "Entrar con Google"}
      </Button>
      <Button
        className="w-full justify-start gap-3 rounded-2xl"
        onClick={() => signIn("apple")}
        type="button"
        variant="secondary"
      >
        <Apple className="size-4" />
        {pendingProvider === "apple" ? "Conectando con Apple..." : "Entrar con Apple"}
      </Button>
      {error ? <p className="text-sm text-[#fecaca]">{error}</p> : null}
    </div>
  );
}
