import { notFound } from "next/navigation";
import { Listing } from "@/components/VideoCard";
import { listVideos } from "@/lib/queries";
export default async function P({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const v = await listVideos({ tag: slug }); if (!v.length) notFound();
  return <Listing title={`Tag: ${decodeURIComponent(slug).replace(/-/g, " ")} (${v.length})`} videos={v} />;
}
