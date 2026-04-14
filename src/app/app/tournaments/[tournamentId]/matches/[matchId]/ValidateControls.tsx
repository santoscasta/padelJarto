'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { validateResultAction } from './actions';

export function ValidateControls({ tournamentId, matchId }: { tournamentId: string; matchId: string }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Button
        disabled={isPending}
        onClick={() => start(async () => {
          const r = await validateResultAction({ tournamentId, matchId });
          if (!r.ok) setErr(r.message);
          router.refresh();
        })}
      >
        Validar resultado
      </Button>
      {err ? <p className="text-sm text-[color:var(--color-danger)]">{err}</p> : null}
    </div>
  );
}
