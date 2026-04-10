import { Card } from "@/components/ui/card";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const currentUser = await requireCurrentUser();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-[family:var(--font-display)] text-3xl tracking-tight text-white">
        Mi perfil
      </h1>
      <p className="mt-2 text-sm text-[#a8a29e]">{currentUser.email}</p>

      <Card className="mt-6 rounded-2xl">
        <ProfileEditForm profile={currentUser} />
      </Card>
    </main>
  );
}
