import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/session";
import { getTournamentRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const notifications = await repository.getNotifications(currentUser.id);

  return (
    <AppShell currentUser={currentUser} notifications={notifications}>
      {children}
    </AppShell>
  );
}
