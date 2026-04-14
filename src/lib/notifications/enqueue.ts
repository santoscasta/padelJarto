import type { Repository } from '@/lib/repositories/types';
import type { EmailPayloadInput } from './payloads';

export type EnqueueArgs = Readonly<{
  userId: string;
  kind: EmailPayloadInput['kind'];
  payload: EmailPayloadInput;
  dispatcherUrl: string;
  dispatcherKey: string;
}>;

export async function enqueueNotification(
  repo: Repository,
  args: EnqueueArgs,
): Promise<void> {
  const created = await repo.createNotification({
    userId: args.userId,
    kind: args.kind,
    payload: args.payload as unknown as Readonly<Record<string, unknown>>,
  });

  // Fire-and-forget: the dispatcher will mark the row sent.
  try {
    await fetch(args.dispatcherUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${args.dispatcherKey}`,
      },
      body: JSON.stringify({ notificationId: created.id }),
    });
  } catch {
    // Swallow — the edge function cron can pick up unsent rows as a fallback.
  }
}
