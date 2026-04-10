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
          <option value="principiante">Principiante</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
          <option value="competicion">Competición</option>
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

      <Button type="submit">Guardar cambios</Button>
    </form>
  );
}
