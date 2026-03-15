/*
  Seed users with location data for heatmap visualization.
  - Uses location data from public/locations/ JSON files
  - Creates 200 PATIENT users with random demographics
  - All fields except authId and avatar are populated
  Run: node scripts/seed-users.js
*/

const { PrismaClient } = require("../../lib/generated/prisma");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

const GENDERS = ["MALE", "FEMALE", "OTHER"];
const USER_COUNT = 200;

const regions = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../public/locations/regions.json"), "utf-8")
);
const provinces = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../public/locations/provinces.json"), "utf-8")
);
const municipalities = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../public/locations/municipalities.json"), "utf-8")
);
const barangays = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../public/locations/barangays.json"), "utf-8")
);

const firstNames = [
  "Juan", "Maria", "Jose", "Ana", "Pedro", "Rosa", "Carlos", "Carmen", "Miguel", "Elena",
  "Antonio", "Luisa", "Francisco", "Mercedes", "Javier", "Teresa", "Fernando", "Patricia",
  "Ricardo", "Monica", "Eduardo", "Gabriela", "Luis", "Silvia", "Alejandro", "Claudia",
  "Diego", "Valeria", "Andres", "Natalia", "Sebastian", "Daniela", "Mateo", "Isabella",
  "Gabriel", "Sofia", "Rafael", "Camila", "David", "Lucia", "Mario", "Andrea", "Jorge",
  "Paula", "Oscar", "Diana", "Ramon", "Flor", "Emilio", "Veronica", "Adrian", "Jessica"
];

const lastNames = [
  "Santos", "Rodriguez", "Cruz", "Garcia", "Martinez", "Lopez", "Gonzalez", "Perez",
  "Sanchez", "Ramirez", "Torres", "Flores", "Rivera", "Gomez", "Diaz", "Reyes", "Castro",
  "Morales", "Ortiz", "Gutierrez", "Chavez", "Ramos", "Vargas", "Castillo", "Jimenez",
  "Moreno", "Romero", "Herrera", "Medina", "Aguilar", "Vega", "Reyes", "Mendez", "Guerrero",
  "Navarro", "Mendoza", "Ruiz", "Fernandez", "Alvarez", "Silva", "Soto", "Delgado", "Rojas",
  "Nunez", "Ibarra", "Miranda", "Acosta", "Estrada", "Granados", "Campos", "Barrera"
];

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randIn(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(firstName, lastName, index) {
  const domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
  const domain = randChoice(domains);
  const num = randIn(1, 999);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${num}@${domain}`;
}

function getRandomLocation() {
  const region = randChoice(regions);
  const regionProvinces = provinces.filter((p) => p.regionPsgc === region.psgc);
  
  if (regionProvinces.length === 0) {
    return getRandomLocation();
  }
  
  const province = randChoice(regionProvinces);
  const provinceMunicipalities = municipalities.filter(
    (m) => m.provincePsgc === province.psgc
  );
  
  if (provinceMunicipalities.length === 0) {
    return { region, province, municipality: null };
  }
  
  const municipality = randChoice(provinceMunicipalities);
  const municipalityBarangays = barangays.filter(
    (b) => b.municipalityPsgc === municipality.psgc
  );
  
  const barangay = municipalityBarangays.length > 0 ? randChoice(municipalityBarangays) : null;

  const lat = getApproximateLat(municipality.psgc);
  const lng = getApproximateLng(municipality.psgc);

  return {
    region: region.name,
    province: province.name,
    city: municipality.name,
    barangay: barangay?.name || null,
    latitude: lat + (Math.random() - 0.5) * 0.1,
    longitude: lng + (Math.random() - 0.5) * 0.1,
  };
}

function getApproximateLat(psgc) {
  const psgcNum = parseInt(psgc);
  const regionCode = Math.floor(psgcNum / 100000000);
  
  const regionLats = {
    1: 17.5,
    2: 17.0,
    3: 15.0,
    4: 14.0,
    5: 13.5,
    6: 11.0,
    7: 9.8,
    8: 11.5,
    9: 8.0,
    10: 8.5,
    11: 7.0,
    12: 6.5,
    13: 9.3,
    14: 17.5,
    16: 9.3,
    17: 12.5,
    19: 7.0,
  };
  
  return regionLats[regionCode] || 12.0;
}

function getApproximateLng(psgc) {
  const psgcNum = parseInt(psgc);
  const regionCode = Math.floor(psgcNum / 100000000);
  
  const regionLngs = {
    1: 120.5,
    2: 122.0,
    3: 120.8,
    4: 121.5,
    5: 123.5,
    6: 122.5,
    7: 124.0,
    8: 125.0,
    9: 123.0,
    10: 124.5,
    11: 125.5,
    12: 124.5,
    13: 125.5,
    14: 120.5,
    16: 125.5,
    17: 120.0,
    19: 124.0,
  };
  
  return regionLngs[regionCode] || 122.0;
}

function generateName() {
  const firstName = randChoice(firstNames);
  const lastName = randChoice(lastNames);
  return `${firstName} ${lastName}`;
}

async function seed() {
  try {
    console.log(`Seeding ${USER_COUNT} users with location data...`);

    const existingCount = await prisma.user.count();
    console.log(`Existing users: ${existingCount}`);

    const users = [];
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < USER_COUNT; i++) {
      const firstName = randChoice(firstNames);
      const lastName = randChoice(lastNames);
      const name = `${firstName} ${lastName}`;
      let email = generateEmail(firstName, lastName, i + existingCount);
      
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        email = `user${existingCount + i + 1}@example.com`;
      }

      const location = getRandomLocation();
      const age = randIn(1, 100);
      const gender = randChoice(GENDERS);

      try {
        const user = await prisma.user.create({
          data: {
            email,
            name,
            role: "PATIENT",
            gender,
            age,
            region: location.region,
            province: location.province,
            city: location.city,
            barangay: location.barangay,
            latitude: location.latitude,
            longitude: location.longitude,
          },
        });
        users.push(user);
        created++;
        
        if (created % 50 === 0) {
          console.log(`Created ${created} users...`);
        }
      } catch (e) {
        if (e.code === "P2002") {
          skipped++;
          console.log(`Skipping duplicate email: ${email}`);
        } else {
          console.error(`Error creating user: ${e.message}`);
        }
      }
    }

    console.log(`\nDone! Created ${created} users, skipped ${skipped} duplicates.`);
    console.log(`Total users in database: ${existingCount + created - skipped}`);
  } catch (e) {
    console.error("Seeding error:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
