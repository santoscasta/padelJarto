'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { updatePairDisplayNameAction } from '@/app/app/tournaments/actions';
import { cn } from '@/lib/utils/cn';

type Props = Readonly<{
  pairId: string;
  /** Current display name, or null if the pair has no custom name yet. */
  displayName: string | null;
  /** Fallback label ("Nombre / Nombre") rendered when no display name is set. */
  fallback: string;
  className?: string;
}>;

/**
 * Inline editor for a pair's custom display name. Renders the name (or
 * fallback) with a pencil to start editing. The parent is responsible for
 * only rendering this component when the viewer is a member of the pair —
 * the server action does the authoritative auth check.
 */
export function EditablePairName({
  pairId,
  displayName,
  fallback,
  className,
}: Props) {
  const router = useRouter();
  const [isEditing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function startEdit() {
    setValue(displayName ?? '');
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setValue(displayName ?? '');
    setError(null);
    setEditing(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = value.trim();
    if (trimmed.length > 40) {
      setError('Máximo 40 caracteres');
      return;
    }
    start(async () => {
      const res = await updatePairDisplayNameAction({
        pairId,
        displayName: trimmed.length === 0 ? null : trimmed,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <form onSubmit={submit} className={cn('flex flex-col gap-2', className)}>
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={fallback}
            maxLength={40}
            disabled={isPending}
            aria-label="Nombre de la pareja"
            className="font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-tight"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            aria-label="Guardar"
          >
            <Check className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={cancelEdit}
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-xs text-[color:var(--color-danger)]">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-[color:var(--color-ink-mute)]">
          Deja vacío para volver a «{fallback}».
        </p>
      </form>
    );
  }

  const visible = displayName ?? fallback;
  const isCustom = displayName !== null;

  return (
    <button
      type="button"
      onClick={startEdit}
      className={cn(
        'group inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-left transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--color-surface-2)]',
        className,
      )}
      aria-label="Editar nombre de la pareja"
    >
      <span
        className={cn(
          'truncate font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-tight',
          isCustom ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-soft)]',
        )}
      >
        {visible}
      </span>
      <Pencil
        className="h-3.5 w-3.5 text-[color:var(--color-ink-mute)] transition-colors duration-[var(--duration-fast)] group-hover:text-[color:var(--color-accent)]"
        aria-hidden
      />
    </button>
  );
}
