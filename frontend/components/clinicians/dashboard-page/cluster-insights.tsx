import { getPatientClusters } from "@/utils/cluster";
import { Lightbulb, MapPin, Users, TrendingUp } from "lucide-react";

const DEFAULT_K = 8;

interface Insight {
  icon: React.ReactNode;
  text: string;
  count: number;
}

function generateInsights(data: any): Insight[] {
  const insights: Insight[] = [];
  const stats = data.cluster_statistics || [];

  if (stats.length === 0) return insights;

  // Collect disease-city correlations from all clusters
  const allCorrelations: any[] = [];
  for (const cluster of stats) {
    if (
      cluster.disease_city_correlations &&
      cluster.disease_city_correlations.length > 0
    ) {
      allCorrelations.push(...cluster.disease_city_correlations);
    }
  }

  // Sort by count (most concentrated cases first)
  allCorrelations.sort((a, b) => b.count - a.count);

  // Generate insights from top correlations, limiting to 3
  for (const correlation of allCorrelations.slice(0, 3)) {
    insights.push({
      icon: <MapPin className="size-4 text-amber-600 stroke-[2]" />,
      text: `${correlation.disease} patients concentrated in ${correlation.city}`,
      count: correlation.count || 0,
    });
  }

  return insights;
}

const ClusterInsights = async () => {
  try {
    const clusterData = await getPatientClusters(DEFAULT_K);
    const insights = generateInsights(clusterData);

    if (insights.length === 0) {
      return null;
    }

    return (
      <section className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 backdrop-blur-xl border border-amber-200/50 rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 rounded-[12px] shadow-lg shadow-amber-500/20">
            <Lightbulb className="size-5 text-white stroke-[2]" />
          </div>
          <h2 className="text-lg font-semibold text-base-content">
            Key Insights
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-sm border border-amber-100 rounded-[16px] p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02] hover:border-amber-200"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{insight.icon}</div>
                <div>
                  <p className="text-sm font-medium text-base-content leading-relaxed">
                    {insight.text}
                  </p>
                  <span className="text-xs text-muted mt-2 inline-block">
                    {(insight.count || 0).toLocaleString()} cases
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Failed to fetch cluster insights:", error);
    return null;
  }
};

export default ClusterInsights;
