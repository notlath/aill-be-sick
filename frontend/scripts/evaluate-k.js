// Evaluate best k using a disease-dominance purity metric over k=3..10
// Usage: node frontend/scripts/evaluate-k.js [minK] [maxK] [baseUrl]
// baseUrl defaults to http://127.0.0.1:10000

const minK = parseInt(process.argv[2] || "3", 10);
const maxK = parseInt(process.argv[3] || "10", 10);
const baseUrl = process.argv[4] || "http://127.0.0.1:10000";

function purityForResponse(resp) {
  const stats = resp.cluster_statistics || [];
  let total = 0;
  let weighted = 0;
  let minCluster = Number.MAX_SAFE_INTEGER;
  for (const c of stats) {
    const size = Number(c.count || 0);
    if (size < minCluster) minCluster = size;
    total += size;
    let maxPct = 0;
    const dist = c.disease_distribution || {};
    for (const key of Object.keys(dist)) {
      const pct = Number((dist[key] && dist[key].percent) || 0);
      if (pct > maxPct) maxPct = pct;
    }
    weighted += maxPct * size;
  }
  const purity = total > 0 ? Math.round((weighted / total) * 100) / 100 : 0;
  if (!isFinite(minCluster)) minCluster = 0;
  return { purity, minCluster, total };
}

async function main() {
  const results = [];
  for (let k = minK; k <= maxK; k++) {
    try {
      const url = `${baseUrl}/api/patient-clusters?n_clusters=${k}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const { purity, minCluster, total } = purityForResponse(data);
      results.push({ k, purity, minCluster, total });
    } catch (e) {
      results.push({
        k,
        purity: 0,
        minCluster: 0,
        total: 0,
        error: String(e.message || e),
      });
    }
  }

  const sorted = [...results].sort((a, b) => {
    if (b.purity !== a.purity) return b.purity - a.purity;
    return b.minCluster - a.minCluster;
  });
  const best = sorted[0] || null;

  console.log(JSON.stringify({ range: [minK, maxK], results, best }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
