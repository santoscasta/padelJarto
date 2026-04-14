'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { fail, ok, type ActionResult } from '@/lib/domain/action-result';

const MarkReadSchema = z.object({ notificationId: z.string().min(1) });

export async function markNotificationReadAction(
  input: z.input<typeof MarkReadSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    const parsed = MarkReadSchema.safeParse(input);
    if (!parsed.success) return fail('VALIDATION_FAILED', 'Datos inválidos');
    const repo = await getRepo();
    await repo.markNotificationRead(parsed.data.notificationId, session.userId);
    revalidatePath('/app');
    return ok({ id: parsed.data.notificationId });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}
