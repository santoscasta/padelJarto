'use client';
import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { updateMyProfileAction } from '@/app/app/me/actions';

type Props = Readonly<{
  userId: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
}>;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ProfileEditForm({
  userId,
  initialDisplayName,
  initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, startSaving] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function extensionFor(file: File): string {
    const byType = file.type.split('/')[1];
    if (byType) return byType === 'jpeg' ? 'jpg' : byType;
    const byName = file.name.split('.').pop();
    return byName ?? 'jpg';
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = '';
    if (!file) return;
    setError(null);
    setSuccess(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG, WEBP o GIF.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('La imagen pesa más de 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const supabase = createBrowserSupabase();
      const ext = extensionFor(file);
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      // Cache-buster so the new image replaces the old one immediately in the UI.
      const newUrl = `${pub.publicUrl}?v=${Date.now()}`;
      const res = await updateMyProfileAction({ avatarUrl: newUrl });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setAvatarUrl(res.data.avatarUrl);
      setSuccess('Foto actualizada.');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  function onNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      setError('El nombre debe tener entre 1 y 40 caracteres.');
      return;
    }
    if (trimmed === initialDisplayName) {
      setSuccess('Sin cambios.');
      return;
    }
    startSaving(async () => {
      const res = await updateMyProfileAction({ displayName: trimmed });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSuccess('Nombre actualizado.');
      router.refresh();
    });
  }

  const busy = saving || uploading;

  return (
    <div className="space-y-5">
      <Card>
        <CardEyebrow>Foto</CardEyebrow>
        <div className="mt-4 flex items-center gap-5">
          <Avatar src={avatarUrl} name={name} size="xl" />
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={onFileSelected}
              className="hidden"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="h-4 w-4" aria-hidden />
              )}
              {uploading ? 'Subiendo…' : 'Cambiar foto'}
            </Button>
            <p className="text-xs text-[color:var(--color-ink-mute)]">
              JPG / PNG / WEBP, máximo 5 MB.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <form onSubmit={onNameSubmit} className="space-y-4">
          <CardEyebrow>Nombre</CardEyebrow>
          <Field label="Cómo te verán los demás">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              minLength={1}
              required
              disabled={busy}
              placeholder="Tu nombre"
            />
          </Field>
          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
            {saving ? 'Guardando…' : 'Guardar nombre'}
          </Button>
        </form>
      </Card>

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 px-3 py-2 text-sm text-[color:var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}
      {success && !error ? (
        <p className="rounded-[var(--radius-md)] border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/10 px-3 py-2 text-sm text-[color:var(--color-accent)]">
          {success}
        </p>
      ) : null}
    </div>
  );
}
