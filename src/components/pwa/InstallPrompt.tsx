'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!event || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 flex items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-zinc-50 shadow-lg">
      <span className="flex-1">Instala Padeljarto en tu móvil para acceso rápido.</span>
      <Button
        size="sm"
        variant="primary"
        onClick={async () => {
          await event.prompt();
          await event.userChoice;
          setEvent(null);
        }}
      >
        Instalar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
        Ahora no
      </Button>
    </div>
  );
}
