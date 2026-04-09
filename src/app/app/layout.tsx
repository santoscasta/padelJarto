import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await requireCurrentUser();
  return <AppShell currentUser={currentUser}>{children}</AppShell>;
}
