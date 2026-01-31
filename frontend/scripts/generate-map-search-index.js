const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');

const PUBLIC_DIR = path.join(__dirname, '../public/topojson');
const OUTPUT_FILE = path.join(__dirname, '../public/search-index.json');

const index = [];
const cityLookup = new Map(); // City ID -> { provinceId, cityName }

console.log('Starting Map Index Generation (Improved v2)...');

// 1. Process Municipalities/Cities FIRST (from Provdists files) to build Lookup Table
// We need this to correct the Parent ID for Barangays later
const provDir = path.join(PUBLIC_DIR, 'provdists');
if (fs.existsSync(provDir)) {
    const files = fs.readdirSync(provDir).filter(f => f.endsWith('.json'));
    console.log(`Scanning ${files.length} City/Municipality files for lookup...`);

    for (const file of files) {
        try {
            const content = JSON.parse(fs.readFileSync(path.join(provDir, file), 'utf8'));
            Object.keys(content.objects).forEach(key => {
                 const features = topojson.feature(content, content.objects[key]).features;
                 features.forEach(f => {
                     const p = f.properties;
                     const name = p.adm3_en || p.adm2_en; // City Name
                     const id = p.adm3_psgc || p.id;      // City ID
                     const provinceId = p.adm2_psgc;      // Parent Province ID
                     
                     if (name && id) {
                         cityLookup.set(id, {
                             provinceId: provinceId,
                             name: name
                         });
                         
                         // Also add City to Index
                         index.push({
                             l: name + (p.adm2_en && !name.includes(p.adm2_en) ? `, ${p.adm2_en}` : ''), 
                             i: id,
                             t: 'city',
                             p: provinceId // Correct Parent (Province)
                         });
                     }
                 });
            });
        } catch (e) {
             console.warn(`Skipping ${file} in lookup pass: ${e.message}`);
        }
    }
}

// 2. Process Provinces (from Region files)
const regionDir = path.join(PUBLIC_DIR, 'region');
if (fs.existsSync(regionDir)) {
    const files = fs.readdirSync(regionDir).filter(f => f.endsWith('.json'));
    console.log(`Processing ${files.length} Region files...`);
    
    for (const file of files) {
        try {
            const content = JSON.parse(fs.readFileSync(path.join(regionDir, file), 'utf8'));
            Object.keys(content.objects).forEach(key => {
                 const features = topojson.feature(content, content.objects[key]).features;
                 features.forEach(f => {
                     const p = f.properties;
                     const name = p.adm2_en;
                     const id = p.adm2_psgc;
                     const parentId = p.adm1_psgc; 
                     
                     if (name && id) {
                         index.push({
                             l: name,          
                             i: id,            
                             t: 'province',    
                             p: parentId       
                         });
                     }
                 });
            });
        } catch (e) {
            // ignore
        }
    }
}

// 3. Process Barangays (from Municities files)
const muniDir = path.join(PUBLIC_DIR, 'municities');
if (fs.existsSync(muniDir)) {
    const files = fs.readdirSync(muniDir).filter(f => f.endsWith('.json'));
    console.log(`Processing ${files.length} Municipality files (Barangays)...`);

    for (const file of files) {
        try {
            const content = JSON.parse(fs.readFileSync(path.join(muniDir, file), 'utf8'));
            Object.keys(content.objects).forEach(key => {
                 const features = topojson.feature(content, content.objects[key]).features;
                 features.forEach(f => {
                     const p = f.properties;
                     const name = p.adm4_en;
                     const id = p.adm4_psgc || p.id;
                     
                     // Crucial: Determine valid Parent Province ID
                     // 1. Try adm2_psgc from property (standard provinces)
                     // 2. Try looking up the City ID (adm3/adm2 mismatch) in our lookup table.
                     // The file usually belongs to a City. The 'adm2' property might BE the City ID (NCR case).
                                          
                     let finalParentId = p.adm2_psgc;
                     let cityName = p.adm3_en;

                     // Check if adm2_psgc is actually a City in our lookup?
                     if (cityLookup.has(p.adm2_psgc)) {
                         // Yes, so adm2_psgc is a city. Get the REAL province from lookup.
                         const cityData = cityLookup.get(p.adm2_psgc);
                         finalParentId = cityData.provinceId;
                         cityName = cityData.name;
                     } 
                     // Check if there is an explicit City ID (adm3) that is in lookup
                     else if (p.adm3_psgc && cityLookup.has(p.adm3_psgc)) {
                          const cityData = cityLookup.get(p.adm3_psgc);
                          finalParentId = cityData.provinceId;
                          cityName = cityData.name;
                     }

                     if (name && id) {
                         const label = cityName ? `${name}, ${cityName}` : name;
                         index.push({
                             l: name,
                             i: id,
                             t: 'barangay',
                             p: finalParentId, 
                             lbl: label
                         });
                     }
                 });
            });
        } catch (e) {
             // ignore
        }
    }
}

console.log(`Total indexed items: ${index.length}`);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index));
console.log(`Index saved to ${OUTPUT_FILE}`);
