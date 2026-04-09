import { notFound, redirect } from "next/navigation";
import { EventBoard } from "@/components/events/event-board";
import { requireCurrentUser } from "@/lib/auth/session";
import { getEventBundleById } from "@/lib/repositories/event-repository";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const user = await requireCurrentUser();
  const { eventId } = await params;
  const bundle = await getEventBundleById(eventId);

  if (!bundle) notFound();
  if (bundle.event.organizerId && bundle.event.organizerId !== user.id) {
    redirect("/app");
  }

  return <EventBoard initialBundle={bundle} />;
}
