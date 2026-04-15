import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CardEyebrow } from '@/components/ui/Card';
import { NewTournamentForm } from './NewTournamentForm';

export default function NewTournamentPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/app/tournaments"
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-soft)] transition-colors hover:text-[color:var(--color-ink)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Torneos
      </Link>

      <header>
        <CardEyebrow>Nuevo</CardEyebrow>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold uppercase tracking-tight">
          Crear torneo
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
          Elige un preset o configura los detalles a tu gusto. Cambias todo después.
        </p>
      </header>

      <NewTournamentForm />
    </div>
  );
}
