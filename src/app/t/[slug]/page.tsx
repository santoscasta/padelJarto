import { notFound } from "next/navigation";
import { PublicEventView } from "@/components/events/public-event-view";
import { getEventBundleBySlug } from "@/lib/repositories/event-repository";

export const revalidate = 0;

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = await getEventBundleBySlug(slug);
  if (!bundle) notFound();

  return <PublicEventView initialBundle={bundle} />;
}
