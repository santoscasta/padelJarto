import { LoginButton } from '@/components/auth/LoginButton';

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <LoginContent searchParams={searchParams} />;
}

async function LoginContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="min-h-dvh grid place-items-center p-8">
      <div className="max-w-sm text-center space-y-6">
        <h1 className="text-[length:var(--text-display)] font-semibold tracking-tight">Padeljarto</h1>
        <p className="text-[color:var(--color-ink-soft)]">
          La app privada para organizar torneos con tu grupo de padel.
        </p>
        <LoginButton next={sp.next ?? '/app'} />
      </div>
    </main>
  );
}
