import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CardEyebrow } from '@/components/ui/Card';
import { requireSession } from '@/lib/auth/session';
import { ProfileEditForm } from './ProfileEditForm';

export default async function EditProfilePage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <Link
        href={`/app/players/${session.player.id}`}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-soft)] transition-colors hover:text-[color:var(--color-ink)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Mi perfil
      </Link>

      <header>
        <CardEyebrow>Tu perfil</CardEyebrow>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold uppercase tracking-tight">
          Editar
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
          Cambia tu nombre y tu foto como aparecen en todos los torneos.
        </p>
      </header>

      <ProfileEditForm
        userId={session.userId}
        initialDisplayName={session.displayName}
        initialAvatarUrl={session.player.avatarUrl}
      />
    </div>
  );
}
