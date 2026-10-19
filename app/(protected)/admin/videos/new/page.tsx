import VideoForm from "@/components/admin/VideoForm";
import { categoryCounts, tagCounts } from "@/lib/queries";
export default async function New() {
  const [c, t] = await Promise.all([categoryCounts(), tagCounts()]);
  return (<><p className="eyebrow">VIDEOS</p><h1 className="h1">Add video</h1><VideoForm categories={c.map(x => ({ id: x.id, name: x.name }))} allTags={t.map(x => x.name)} /></>);
}
