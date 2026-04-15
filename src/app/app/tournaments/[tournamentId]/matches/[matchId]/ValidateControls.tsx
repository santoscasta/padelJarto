'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { validateResultAction } from './actions';

export function ValidateControls({
  tournamentId,
  matchId,
}: {
  tournamentId: string;
  matchId: string;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        disabled={isPending}
        size="lg"
        className="w-full"
        onClick={() =>
          start(async () => {
            const r = await validateResultAction({ tournamentId, matchId });
            if (!r.ok) setErr(r.message);
            router.refresh();
          })
        }
      >
        <ShieldCheck className="h-4 w-4" aria-hidden />
        {isPending ? 'Validando…' : 'Validar resultado'}
      </Button>
      {err ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 px-3 py-2 text-sm text-[color:var(--color-danger)]"
        >
          {err}
        </p>
      ) : null}
    </div>
  );
}
