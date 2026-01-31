import PhilippinesMap from "@/components/visualization/philippines-map";

export default function TrendsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Disease Trends</h1>
        <p className="text-gray-500">
          Visualizing disease spread and statistics across the Philippines.
        </p>
      </div>

      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-0">
          <PhilippinesMap />
        </div>
      </div>
    </div>
  );
}
