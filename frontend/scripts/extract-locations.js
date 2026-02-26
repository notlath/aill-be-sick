/**
 * extract-locations.js
 *
 * Reads all Philippine TopoJSON files in public/topojson/ and outputs
 * structured JSON files under public/locations/:
 *
 *   regions.json          – flat list of all regions
 *   provinces.json        – flat list of all provinces, with adm1_psgc reference
 *   municipalities.json   – flat list of all municipalities/cities, with adm2_psgc reference
 *   barangays.json        – flat list of all barangays, with adm3_psgc reference
 *
 * Run from the frontend directory:
 *   node scripts/extract-locations.js
 */

const fs = require("fs");
const path = require("path");

const TOPO_DIR = path.join(__dirname, "..", "public", "topojson");
const OUT_DIR = path.join(__dirname, "..", "public", "locations");

// ── helpers ────────────────────────────────────────────────────────────────

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function getGeometries(topo) {
  const objectName = Object.keys(topo.objects)[0];
  return topo.objects[objectName].geometries ?? [];
}

// ── 1. Regions (country.topo.0.01.json) ───────────────────────────────────

console.log("Extracting regions…");
const countryFile = path.join(TOPO_DIR, "country", "country.topo.0.01.json");
const countryTopo = readJson(countryFile);
const regions = getGeometries(countryTopo).map((g) => ({
  psgc: String(g.properties.adm1_psgc),
  name: g.properties.adm1_en,
}));
regions.sort((a, b) => a.name.localeCompare(b.name));
console.log(`  → ${regions.length} regions`);

// ── 2. Provinces (provdists-region-*.topo.0.01.json) ──────────────────────

console.log("Extracting provinces…");
const regionDir = path.join(TOPO_DIR, "region");
const provinces = [];

for (const file of fs.readdirSync(regionDir)) {
  if (!file.endsWith(".json")) continue;
  const topo = readJson(path.join(regionDir, file));
  for (const g of getGeometries(topo)) {
    const p = g.properties;
    if (!p.adm2_en || !p.adm2_psgc) continue;
    provinces.push({
      psgc: String(p.adm2_psgc),
      name: p.adm2_en,
      regionPsgc: String(p.adm1_psgc),
      geoLevel: p.geo_level, // "Prov" | "Dist" | "City" etc.
    });
  }
}
// Deduplicate by psgc (a province may appear in multiple region files)
const uniqueProvinces = [...new Map(provinces.map((p) => [p.psgc, p])).values()];
uniqueProvinces.sort((a, b) => a.name.localeCompare(b.name));
provinces.length = 0;
provinces.push(...uniqueProvinces);
console.log(`  → ${provinces.length} provinces/districts`);

// ── 3. Municipalities / Cities (municities-provdist-*.topo.0.1.json) ───────

console.log("Extracting municipalities / cities…");
const provdistDir = path.join(TOPO_DIR, "provdists");
const municipalities = [];

for (const file of fs.readdirSync(provdistDir)) {
  if (!file.endsWith(".json")) continue;
  const topo = readJson(path.join(provdistDir, file));
  for (const g of getGeometries(topo)) {
    const p = g.properties;
    if (!p.adm3_en || !p.adm3_psgc) continue;
    municipalities.push({
      psgc: String(p.adm3_psgc),
      name: p.adm3_en,
      provincePsgc: String(p.adm2_psgc),
      regionPsgc: String(p.adm1_psgc),
      geoLevel: p.geo_level, // "Mun" | "City" | "SubMun"
    });
  }
}
const uniqueMunicipalities = [...new Map(municipalities.map((m) => [m.psgc, m])).values()];
uniqueMunicipalities.sort((a, b) => a.name.localeCompare(b.name));
municipalities.length = 0;
municipalities.push(...uniqueMunicipalities);
console.log(`  → ${municipalities.length} municipalities/cities`);

// ── 4. Barangays (bgysubmuns-municity-*.topo.0.1.json) ────────────────────

console.log("Extracting barangays…");
const municipityDir = path.join(TOPO_DIR, "municities");
const barangays = [];

for (const file of fs.readdirSync(municipityDir)) {
  if (!file.endsWith(".json")) continue;
  const topo = readJson(path.join(municipityDir, file));
  for (const g of getGeometries(topo)) {
    const p = g.properties;
    if (!p.adm4_en || !p.adm4_psgc) continue;
    barangays.push({
      psgc: String(p.adm4_psgc),
      name: p.adm4_en,
      municipalityPsgc: String(p.adm3_psgc),
      provincePsgc: String(p.adm2_psgc),
      regionPsgc: String(p.adm1_psgc),
    });
  }
}
const uniqueBarangays = [...new Map(barangays.map((b) => [b.psgc, b])).values()];
uniqueBarangays.sort((a, b) => a.name.localeCompare(b.name));
barangays.length = 0;
barangays.push(...uniqueBarangays);
console.log(`  → ${barangays.length} barangays`);

// ── Write output files ─────────────────────────────────────────────────────

fs.mkdirSync(OUT_DIR, { recursive: true });

const write = (filename, data) => {
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`  ✓ ${filename} (${kb} KB)`);
};

console.log("\nWriting output files…");
write("regions.json", regions);
write("provinces.json", provinces);
write("municipalities.json", municipalities);
write("barangays.json", barangays);

console.log("\nDone.");
