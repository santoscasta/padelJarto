"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup" | "reset";

export function AuthForm({ nextPath = "/app" }: Readonly<{ nextPath?: string }>) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!supabase) {
      setError("Supabase no está configurado en este entorno.");
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "signin") {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });
          if (signInError) {
            setError(translateError(signInError.message));
            return;
          }
          router.refresh();
          router.push(nextPath);
          return;
        }

        if (mode === "signup") {
          if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
          }
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
              data: { full_name: fullName.trim() || email.trim().split("@")[0] },
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
            },
          });
          if (signUpError) {
            setError(translateError(signUpError.message));
            return;
          }
          if (data.session) {
            router.refresh();
            router.push(nextPath);
            return;
          }
          setInfo("Cuenta creada. Revisa tu email para confirmar antes de entrar.");
          return;
        }

        if (mode === "reset") {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            email.trim().toLowerCase(),
            {
              redirectTo: `${window.location.origin}/auth/reset-password`,
            },
          );
          if (resetError) {
            setError(translateError(resetError.message));
            return;
          }
          setInfo("Te enviamos un enlace para restablecer la contraseña.");
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Error inesperado.");
      }
    });
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-black/30 p-1 text-xs font-semibold">
        {(
          [
            ["signin", "Entrar"],
            ["signup", "Crear cuenta"],
            ["reset", "Olvidé"],
          ] as const
        ).map(([value, label]) => (
          <button
            className={`rounded-full px-3 py-2 transition ${
              mode === value ? "bg-[#f97316] text-[#1c1917]" : "text-[#d6d3d1] hover:text-[#fff7ed]"
            }`}
            key={value}
            onClick={() => {
              setMode(value);
              setError(null);
              setInfo(null);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <input
            autoComplete="name"
            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-[#fff7ed] placeholder:text-[#a8a29e] focus:border-[#fb923c] focus:outline-none"
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Tu nombre"
            type="text"
            value={fullName}
          />
        ) : null}

        <input
          autoComplete="email"
          className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-[#fff7ed] placeholder:text-[#a8a29e] focus:border-[#fb923c] focus:outline-none"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          required
          type="email"
          value={email}
        />

        {mode !== "reset" ? (
          <input
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-[#fff7ed] placeholder:text-[#a8a29e] focus:border-[#fb923c] focus:outline-none"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "signup" ? "Contraseña (mín. 6)" : "Contraseña"}
            required
            type="password"
            value={password}
          />
        ) : null}

        <button
          className="w-full rounded-2xl bg-[#f97316] px-5 py-4 text-sm font-semibold text-[#1c1917] transition hover:bg-[#fb923c] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending
            ? "Procesando…"
            : mode === "signin"
              ? "Entrar"
              : mode === "signup"
                ? "Crear cuenta"
                : "Enviar enlace"}
        </button>

        {error ? <p className="text-sm text-[#fecaca]">{error}</p> : null}
        {info ? <p className="text-sm text-[#bbf7d0]">{info}</p> : null}
      </form>
    </div>
  );
}

function translateError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (lower.includes("user already registered")) return "Ese email ya tiene cuenta. Usa Entrar u Olvidé.";
  if (lower.includes("email rate limit")) return "Demasiados intentos. Espera unos minutos.";
  if (lower.includes("weak password") || lower.includes("should be at least"))
    return "Contraseña demasiado débil.";
  if (lower.includes("email not confirmed"))
    return "Aún no has confirmado tu email. Revisa tu bandeja.";
  if (lower.includes("database error saving new user"))
    return "Error interno al crear la cuenta. Avisa al organizador.";
  return message;
}
