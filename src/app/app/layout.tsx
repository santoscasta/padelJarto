import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await requireCurrentUser();
  return <AppShell currentUser={currentUser}>{children}</AppShell>;
}
