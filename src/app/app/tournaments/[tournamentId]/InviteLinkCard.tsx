import { Link2 } from 'lucide-react';
import { Card, CardEyebrow } from '@/components/ui/Card';

export function InviteLinkCard({ baseUrl }: { baseUrl: string }) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--color-surface-2)] text-[color:var(--color-accent)]">
          <Link2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <CardEyebrow>Compartir torneo</CardEyebrow>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-tight">
            Invita a tu grupo
          </p>
          <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
            Genera un link desde los controles del organizador. Caduca en 7 días.
          </p>
          <code className="mt-3 inline-block max-w-full overflow-hidden truncate rounded-[var(--radius-sm)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] px-2 py-1 font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-ink-soft)]">
            {baseUrl}/invite/…
          </code>
        </div>
      </div>
    </Card>
  );
}
