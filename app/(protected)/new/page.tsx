import { Listing } from "@/components/VideoCard";
import { listVideos } from "@/lib/queries";
export default async function P() { return <Listing title="New" videos={await listVideos()} />; }
