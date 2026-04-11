"use client";

import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/domain/types";
import { updateProfileAction } from "@/app/app/actions";

interface ProfileEditFormProps {
  profile: Profile;
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  return (
    <form action={updateProfileAction} className="space-y-4">
      <div>
        <label className="field-label">Nombre completo</label>
        <input
          name="fullName"
          type="text"
          defaultValue={profile.fullName}
          className="field-input"
          required
        />
      </div>

      <div>
        <label className="field-label">Nombre de usuario</label>
        <input
          name="username"
          type="text"
          defaultValue={profile.username ?? ""}
          className="field-input"
          placeholder="@username"
        />
      </div>

      <div>
        <label className="field-label">Ciudad</label>
        <input
          name="city"
          type="text"
          defaultValue={profile.city ?? ""}
          className="field-input"
          placeholder="Madrid, Barcelona..."
        />
      </div>

      <div>
        <label className="field-label">Nivel</label>
        <select
          name="level"
          defaultValue={profile.level ?? ""}
          className="field-select"
        >
          <option value="">Sin especificar</option>
          <option value="beginner">Principiante</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzado</option>
          <option value="pro">Profesional</option>
        </select>
      </div>

      <div>
        <label className="field-label">Mano dominante</label>
        <select
          name="dominantHand"
          defaultValue={profile.dominantHand ?? ""}
          className="field-select"
        >
          <option value="">Sin especificar</option>
          <option value="right">Diestro</option>
          <option value="left">Zurdo</option>
          <option value="ambidextrous">Ambidiestro</option>
        </select>
      </div>

      <div>
        <label className="field-label">Club</label>
        <input
          name="club"
          type="text"
          defaultValue={profile.club ?? ""}
          className="field-input"
          placeholder="Club de pádel..."
        />
      </div>

      <div>
        <label className="field-label">Bio</label>
        <textarea
          name="bio"
          defaultValue={profile.bio ?? ""}
          className="field-input min-h-[80px] resize-none"
          placeholder="Algo sobre ti..."
        />
      </div>

      <Button type="submit">Guardar cambios</Button>
    </form>
  );
}
