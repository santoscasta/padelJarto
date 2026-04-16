'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { fail, ok, type ActionResult } from '@/lib/domain/action-result';

const UpdateMyProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(40).optional(),
    // Accept a Supabase Storage / https URL, or null to clear and fall back.
    avatarUrl: z.union([z.string().url().max(500), z.null()]).optional(),
  })
  .refine(
    (v) => v.displayName !== undefined || v.avatarUrl !== undefined,
    { message: 'No hay nada que actualizar' },
  );

type Patch = z.input<typeof UpdateMyProfileSchema>;

export async function updateMyProfileAction(
  input: Patch,
): Promise<ActionResult<{ displayName: string; avatarUrl: string | null }>> {
  const session = await (async () => {
    try {
      return await requireSession();
    } catch {
      return null;
    }
  })();
  if (!session) {
    return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
  }

  const parsed = UpdateMyProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.');
      if (path) fields[path] = issue.message;
    }
    return fail(
      'VALIDATION_FAILED',
      'Datos inválidos',
      Object.keys(fields).length > 0 ? fields : undefined,
    );
  }

  const repo = await getRepo();
  try {
    const player = await repo.updateMyProfile(session.userId, parsed.data);
    // The user's name/avatar can show up almost anywhere.
    revalidatePath('/app');
    revalidatePath('/app/tournaments');
    revalidatePath('/app/leaderboard');
    revalidatePath(`/app/players/${player.id}`);
    revalidatePath('/app/me/edit');
    return ok({
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return fail('UNEXPECTED', message);
  }
}
