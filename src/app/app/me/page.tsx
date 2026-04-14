import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';

export default async function MePage() {
  const session = await requireSession();
  redirect(`/app/players/${session.player.id}`);
}
