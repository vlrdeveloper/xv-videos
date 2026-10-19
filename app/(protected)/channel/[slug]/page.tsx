import { notFound } from "next/navigation";
import { Listing } from "@/components/VideoCard";
import { listVideos } from "@/lib/queries";
export default async function P({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const v = await listVideos({ channel: slug }); if (!v.length) notFound();
  return <Listing title={v[0].channel_name} videos={v} />;
}
