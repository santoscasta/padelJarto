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
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const supabase = createSupabaseBrowserClient();

  const handleOAuth = async (provider: "google" | "apple") => {
    setIsLoading(true);
    if (!supabase) {
      setError("Supabase no configurado");
      setIsLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsLoading(false);
    }
    // If no error, the browser will redirect to the OAuth provider
  };

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
      {/* Social login buttons */}
      <div className="grid gap-3 mb-6">
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={isLoading || isPending}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
        >
          <svg className="size-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("apple")}
          disabled={isLoading || isPending}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continuar con Apple
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#1a1412] px-3 text-[#a8a29e]">o con email</span>
        </div>
      </div>

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
          disabled={isPending || isLoading}
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
