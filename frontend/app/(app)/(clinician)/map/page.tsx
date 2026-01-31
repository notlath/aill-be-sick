import MapTabs from "@/components/clinicians/map-page/map-tabs";
import { getPatientClusters } from "@/utils/cluster";

export default async function MapPage() {
  const kDefault = 8;
  const clusters = await getPatientClusters(kDefault);

  return (
    <main className="container px-8 pt-12 pb-8 md:px-16 lg:px-24">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="font-semibold text-6xl tracking-tight bg-gradient-to-br from-base-content via-base-content to-base-content/70 bg-clip-text text-transparent">
            Disease Map
          </h1>
          <p className="text-lg text-muted max-w-2xl">
            Visualizing disease spread and statistics across the Philippines.
          </p>
        </div>
        <MapTabs clusters={clusters} initialK={kDefault} />
      </div>
    </main>
  );
}
