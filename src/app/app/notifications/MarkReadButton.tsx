'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { markNotificationReadAction } from './actions';

export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  return (
    <Button
      size="sm" variant="ghost" disabled={isPending}
      onClick={() => start(async () => {
        await markNotificationReadAction({ notificationId: id });
        router.refresh();
      })}
    >
      Marcar leída
    </Button>
  );
}
