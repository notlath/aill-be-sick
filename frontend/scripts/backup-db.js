/*
  backup-db.js — Database backup utility.
  
  Exports all database tables to JSON files in the backups/ directory.
  Each backup is timestamped for easy identification.
  
  Usage:
    node scripts/backup-db.js              # Create new backup
    node scripts/backup-db.js --list       # List all backups
    node scripts/backup-db.js --restore <filename>  # Restore from backup
  
  Run: npm run db:backup
*/

const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("../lib/generated/prisma");

const prisma = new PrismaClient();
const BACKUPS_DIR = path.join(__dirname, "../backups");

// Models to backup (in order to respect foreign key constraints for restore)
const MODELS = [
  "user",
  "chat",
  "message",
  "tempDiagnosis",
  "diagnosis",
  "explanation",
  "diagnosisOverride",
  "alert",
  "alertNote",
  "allowedClinicianEmail",
  "diagnosisNote",
  "auditLog",
  "deletionSchedule",
  "diagnosis_sessions",
];

function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    console.log(`Created backups directory: ${BACKUPS_DIR}`);
  }
}

async function createBackup() {
  ensureBackupsDir();
  
  const timestamp = getTimestamp();
  const backupName = `backup-${timestamp}`;
  const backupPath = path.join(BACKUPS_DIR, backupName);
  
  console.log(`Starting database backup: ${backupName}`);
  console.log("");
  
  const backupData = {};
  let totalRecords = 0;
  
  for (const model of MODELS) {
    try {
      const records = await prisma[model].findMany();
      backupData[model] = records;
      totalRecords += records.length;
      console.log(`  ${model}: ${records.length} records`);
    } catch (e) {
      console.warn(`  ${model}: skipped (${e.message})`);
      backupData[model] = [];
    }
  }
  
  // Write backup file
  const backupJson = JSON.stringify(backupData, null, 2);
  fs.writeFileSync(`${backupPath}.json`, backupJson);
  
  // Compress with gzip
  const zlib = require("zlib");
  const gzipped = zlib.gzipSync(backupJson);
  fs.writeFileSync(`${backupPath}.json.gz`, gzipped);
  
  const jsonSize = (backupJson.length / 1024).toFixed(1);
  const gzSize = (gzipped.length / 1024).toFixed(1);
  
  console.log("");
  console.log(`Backup complete!`);
  console.log(`  Total records: ${totalRecords}`);
  console.log(`  JSON size: ${jsonSize} KB`);
  console.log(`  Gzip size: ${gzSize} KB`);
  console.log(`  Files: ${backupName}.json, ${backupName}.json.gz`);
  
  return backupName;
}

async function listBackups() {
  ensureBackupsDir();
  
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.endsWith(".json") && !f.endsWith(".gz"))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.log("No backups found.");
    return;
  }
  
  console.log("Available backups:");
  console.log("");
  
  for (const file of files) {
    const filePath = path.join(BACKUPS_DIR, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(1);
    const date = stats.mtime.toLocaleString();
    const name = file.replace(".json", "");
    
    console.log(`  ${name}`);
    console.log(`    Size: ${size} KB | Created: ${date}`);
    console.log("");
  }
}

async function restoreBackup(filename) {
  let backupPath = path.join(BACKUPS_DIR, filename);
  
  // Add .json extension if not present
  if (!backupPath.endsWith(".json")) {
    backupPath += ".json";
  }
  
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found: ${backupPath}`);
    console.log("Use --list to see available backups.");
    process.exit(1);
  }
  
  console.log(`Restoring from: ${path.basename(backupPath)}`);
  console.log("WARNING: This will DELETE existing data and replace it with backup data.");
  console.log("");
  
  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  
  // Delete existing data in reverse order to respect foreign keys
  const reverseModels = [...MODELS].reverse();
  
  for (const model of reverseModels) {
    try {
      const deleted = await prisma[model].deleteMany();
      console.log(`  Cleared ${model}: ${deleted.count} records`);
    } catch (e) {
      console.warn(`  ${model}: skip clear (${e.message})`);
    }
  }
  
  console.log("");
  
  // Restore data in order
  let totalRestored = 0;
  
  for (const model of MODELS) {
    const records = backupData[model];
    if (!records || records.length === 0) {
      console.log(`  ${model}: no records to restore`);
      continue;
    }
    
    try {
      for (const record of records) {
        await prisma[model].create({
          data: record,
        });
      }
      console.log(`  ${model}: ${records.length} records restored`);
      totalRestored += records.length;
    } catch (e) {
      console.error(`  ${model}: restore failed (${e.message})`);
    }
  }
  
  console.log("");
  console.log(`Restore complete! ${totalRestored} records restored.`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (command === "--list" || command === "-l") {
      await listBackups();
    } else if (command === "--restore" || command === "-r") {
      if (!args[1]) {
        console.error("Please specify a backup filename.");
        console.log("Usage: node scripts/backup-db.js --restore <filename>");
        process.exit(1);
      }
      await restoreBackup(args[1]);
    } else {
      await createBackup();
    }
  } catch (e) {
    console.error("Error:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
