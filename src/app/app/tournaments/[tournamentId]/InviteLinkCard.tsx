import { Card } from '@/components/ui/Card';

export function InviteLinkCard({ baseUrl }: { baseUrl: string }) {
  return (
    <Card>
      <p className="text-sm font-semibold">Compartir torneo</p>
      <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
        Genera un link desde los controles. Caduca en 7 días.
      </p>
      <p className="mt-3 text-xs text-[color:var(--color-ink-soft)]">Base: {baseUrl}/invite/…</p>
    </Card>
  );
}
