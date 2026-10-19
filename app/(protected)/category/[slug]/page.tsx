import { notFound } from "next/navigation";
import { Listing } from "@/components/VideoCard";
import { listVideos, categoryCounts } from "@/lib/queries";
export default async function P({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const c = (await categoryCounts()).find(x => x.slug === slug); if (!c) notFound();
  return <Listing title={c.name} videos={await listVideos({ category: slug })} />;
}
