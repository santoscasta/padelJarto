"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    startTransition(async () => {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setInfo("Contraseña actualizada. Redirigiendo…");
      setTimeout(() => {
        router.push("/app");
      }, 1200);
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.2),_transparent_30%),linear-gradient(180deg,#100c0b_0%,#1a1311_100%)] px-4 py-10 text-[#fff7ed]">
      <div className="mx-auto max-w-md">
        <Card className="rounded-[32px]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Nueva contraseña</p>
          <h1 className="mt-3 font-[family:var(--font-display)] text-3xl tracking-tight">
            Restablece tu acceso
          </h1>
          <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
            <input
              autoComplete="new-password"
              className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-[#fff7ed] placeholder:text-[#a8a29e] focus:border-[#fb923c] focus:outline-none"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nueva contraseña"
              required
              type="password"
              value={password}
            />
            <input
              autoComplete="new-password"
              className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-[#fff7ed] placeholder:text-[#a8a29e] focus:border-[#fb923c] focus:outline-none"
              minLength={6}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repite la contraseña"
              required
              type="password"
              value={confirm}
            />
            <button
              className="w-full rounded-2xl bg-[#f97316] px-5 py-4 text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Guardando…" : "Guardar contraseña"}
            </button>
            {error ? <p className="text-sm text-[#fecaca]">{error}</p> : null}
            {info ? <p className="text-sm text-[#bbf7d0]">{info}</p> : null}
          </form>
        </Card>
      </div>
    </main>
  );
}
