import { Grid } from "@/components/VideoCard";
import { listVideos } from "@/lib/queries";
export default async function Home() {
  const [pop, recent, all] = await Promise.all([listVideos({ popular: true, limit: 8 }), listVideos({ limit: 12 }), listVideos({ limit: 48 })]);
  return (<>
    <h1 className="h1">Home</h1>
    {pop.length > 0 && <><h2 className="h2">Popular</h2><Grid videos={pop} /></>}
    <h2 className="h2">Recently added</h2><Grid videos={recent} />
    {all.length > 12 && <><h2 className="h2">All videos</h2><Grid videos={all} /></>}
  </>);
}
