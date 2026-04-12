/*
  backup-db.js — Database backup utility.
  
  Exports all database tables to JSON files in the backups/ directory.
  Each backup is timestamped for easy identification.
  
  Usage:
    node scripts/backup-db.js              # Create full backup of all tables
    node scripts/backup-db.js --list       # List all backups
    node scripts/backup-db.js --info        # Show info about latest backup
    node scripts/backup-db.js --info <filename>  # Show info about specific backup
    node scripts/backup-db.js --restore            # Restore latest backup (preserves users 1-5)
    node scripts/backup-db.js --restore --no-preserve  # Restore latest without preserving users
    node scripts/backup-db.js --restore user             # Restore latest backup, specific table only
    node scripts/backup-db.js --restore <filename>       # Restore specific backup file
    node scripts/backup-db.js --restore <filename> user  # Restore specific table from backup file
    node scripts/backup-db.js --restore-only <table> [<table>...]  # Only insert records (no delete) - useful after --restore caused cascade deletes
                                                                       # Example: --restore-only chat diagnosis
    node scripts/backup-db.js --backup <table>   # Backup a specific table only
                                                # Example: node scripts/backup-db.js --backup user 
                                                # Available: user, chat, message, tempDiagnosis,
                                                #            diagnosis, explanation, diagnosisOverride,
                                                #            alert, alertNote, allowedClinicianEmail,
                                                #            diagnosisNote, auditLog, deletionSchedule, diagnosis_sessions
  
  Run: npm run db:backup
*/

const path = require("path");
const fs = require("fs");

// Load environment variables from .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
}

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
  "diagnosticQuestion",
];

// Default user IDs to preserve during restore (hardcoded)
const DEFAULT_PRESERVED_USER_IDS = [1, 2, 3, 4, 5];

// Tables with cascade delete relationships (for warning)
const CASCADE_RELATED_TABLES = {
  user: ["chat", "diagnosis", "deletionSchedule"],
  chat: ["message", "tempDiagnosis"],
  diagnosis: ["alert", "explanation", "diagnosisNote", "diagnosisOverride"],
};

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

async function confirmPrompt(message) {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message + " (y/n): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function getTableCounts() {
  const counts = {};
  for (const model of MODELS) {
    try {
      const count = await prisma[model].count();
      counts[model] = count;
    } catch (e) {
      counts[model] = 0;
    }
  }
  return counts;
}

function printTableCounts(counts, label) {
  console.log(`${label}:`);
  console.log("");
  let total = 0;
  for (const model of MODELS) {
    const count = counts[model] || 0;
    total += count;
    console.log(`  ${model}: ${count}`);
  }
  console.log(`  Total: ${total}`);
  console.log("");
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

  const files = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".gz"))
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

  return files;
}

function getLatestBackup() {
  const files = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".gz"))
    .sort()
    .reverse();

  if (files.length === 0) {
    return null;
  }

  return files[0].replace(".json", "");
}

async function showBackupInfo(filename) {
  let backupPath = path.join(BACKUPS_DIR, filename);

  if (!backupPath.endsWith(".json")) {
    backupPath += ".json";
  }

  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found: ${backupPath}`);
    console.log("Use --list to see available backups.");
    process.exit(1);
  }

  const stats = fs.statSync(backupPath);
  const sizeKB = (stats.size / 1024).toFixed(1);
  const date = stats.mtime.toLocaleString();

  console.log(`Backup: ${filename}`);
  console.log(`  Size: ${sizeKB} KB`);
  console.log(`  Created: ${date}`);
  console.log("");

  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));

  console.log("Tables in backup:");
  console.log("");

  let totalRecords = 0;
  for (const model of MODELS) {
    const records = backupData[model];
    const count = records ? records.length : 0;
    totalRecords += count;
    console.log(`  ${model}: ${count} records`);
  }

  console.log("");
  console.log(`Total: ${totalRecords} records across ${MODELS.length} tables`);
}

async function restoreBackup(filename, preserveIds = []) {
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
  console.log(
    "WARNING: This will DELETE existing data and replace it with backup data.",
  );
  if (preserveIds.length > 0) {
    console.log(`Preserving user IDs: ${preserveIds.join(", ")}`);
  }
  console.log("");
  console.log("Cascade delete warning: Deleting data in tables with foreign key constraints");
  console.log("  may also delete related data in other tables (e.g., deleting user deletes chat, diagnosis).");
  console.log("");

  // Get current table counts before delete
  console.log("Current database state:");
  const countsBefore = await getTableCounts();
  printTableCounts(countsBefore, "  Before restore");

  const confirmed = await confirmPrompt("Do you want to continue?");
  if (!confirmed) {
    console.log("Restore cancelled.");
    process.exit(0);
  }
  console.log("");

  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));

  // Delete existing data in reverse order to respect foreign keys
  // Skip deleting records with preserved IDs
  const reverseModels = [...MODELS].reverse();

  for (const model of reverseModels) {
    try {
      if (preserveIds.length > 0 && model === "user") {
        const deleted = await prisma[model].deleteMany({
          where: { id: { notIn: preserveIds } },
        });
        console.log(
          `  Cleared ${model}: ${deleted.count} records (preserved ${preserveIds.length})`,
        );
      } else {
        const deleted = await prisma[model].deleteMany();
        console.log(`  Cleared ${model}: ${deleted.count} records`);
      }
    } catch (e) {
      console.warn(`  ${model}: skip clear (${e.message})`);
    }
  }

  console.log("");

  // Restore data in order
  // Skip records with preserved IDs
  let totalRestored = 0;

  for (const model of MODELS) {
    const records = backupData[model];
    if (!records || records.length === 0) {
      console.log(`  ${model}: no records to restore`);
      continue;
    }

    let recordsToRestore = records;
    if (preserveIds.length > 0 && model === "user") {
      recordsToRestore = records.filter((r) => !preserveIds.includes(r.id));
      console.log(
        `  ${model}: filtered ${records.length} -> ${recordsToRestore.length} records (preserved ${preserveIds.length})`,
      );
    }

    if (recordsToRestore.length === 0) {
      console.log(`  ${model}: no records to restore after filtering`);
      continue;
    }

    try {
      // Use createMany to preserve explicit IDs from backup
      const result = await prisma[model].createMany({
        data: recordsToRestore,
        skipDuplicates: true,
      });
      console.log(`  ${model}: ${result.count} records restored`);
      totalRestored += result.count;
    } catch (e) {
      console.error(`  ${model}: restore failed (${e.message})`);
    }
  }

  console.log("");

  // Show after restore counts
  console.log("After restore:");
  const countsAfter = await getTableCounts();
  printTableCounts(countsAfter, "  After restore");

  console.log(`Restore complete! ${totalRestored} records restored.`);
}

async function backupSingleModel(modelName) {
  ensureBackupsDir();

  const timestamp = getTimestamp();
  const backupPath = path.join(
    BACKUPS_DIR,
    `${modelName}-backup-${timestamp}.json`,
  );

  console.log(`Starting single-table backup: ${modelName}`);
  console.log("");

  try {
    const records = await prisma[modelName].findMany();
    const backupData = { [modelName]: records };

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    const size = (JSON.stringify(backupData, null, 2).length / 1024).toFixed(1);

    console.log(`Backup complete!`);
    console.log(`  Table: ${modelName}`);
    console.log(`  Records: ${records.length}`);
    console.log(`  Size: ${size} KB`);
    console.log(`  File: ${path.basename(backupPath)}`);
  } catch (e) {
    console.error(`Error backing up ${modelName}: ${e.message}`);
    process.exitCode = 1;
  }
}

async function restoreSingleTable(filename, tableName, preserveIds = DEFAULT_PRESERVED_USER_IDS) {
  let backupPath = path.join(BACKUPS_DIR, filename);

  if (!backupPath.endsWith(".json")) {
    backupPath += ".json";
  }

  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found: ${backupPath}`);
    console.log("Use --list to see available backups.");
    process.exit(1);
  }

  if (!MODELS.includes(tableName)) {
    console.error(`Invalid table name: ${tableName}`);
    console.log("Available tables: " + MODELS.join(", "));
    process.exit(1);
  }

  console.log(
    `Restoring table "${tableName}" from: ${path.basename(backupPath)}`,
  );
  if (preserveIds.length > 0) {
    console.log(`Preserving user IDs: ${preserveIds.join(", ")} (to avoid cascade deleting related data)`);
  }
  console.log("");
  console.log("WARNING: This will DELETE all data in the '${tableName}' table.");
  if (CASCADE_RELATED_TABLES[tableName]) {
    console.log(`  Due to foreign key constraints, this may also delete related data in: ${CASCADE_RELATED_TABLES[tableName].join(", ")}`);
  }
  console.log("");

  // Get current table counts before delete
  console.log("Current database state:");
  const countsBefore = await getTableCounts();
  printTableCounts(countsBefore, "  Before restore");

  const confirmed = await confirmPrompt("Do you want to continue?");
  if (!confirmed) {
    console.log("Restore cancelled.");
    process.exit(0);
  }
  console.log("");

  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  const records = backupData[tableName];

  if (!records || records.length === 0) {
    console.log(`No records found for table "${tableName}" in backup.`);
    return;
  }

  console.log(`Found ${records.length} records in backup for "${tableName}"`);

  // Clear existing data for this table, skipping preserved IDs
  try {
    let deleted;
    if (tableName === "user" && preserveIds.length > 0) {
      deleted = await prisma[tableName].deleteMany({
        where: { id: { notIn: preserveIds } },
      });
      console.log(`  Cleared ${tableName}: ${deleted.count} records (preserved ${preserveIds.length})`);
    } else {
      deleted = await prisma[tableName].deleteMany();
      console.log(`  Cleared ${tableName}: ${deleted.count} records`);
    }
  } catch (e) {
    console.warn(`  ${tableName}: skip clear (${e.message})`);
  }

  // Restore records, skipping preserved IDs (to keep their existing data)
  let recordsToRestore = records;
  if (tableName === "user" && preserveIds.length > 0) {
    recordsToRestore = records.filter((r) => !preserveIds.includes(r.id));
    console.log(`  Filtered ${records.length} -> ${recordsToRestore.length} records (preserved ${preserveIds.length})`);
  }

  if (recordsToRestore.length === 0) {
    console.log("No records to restore after filtering.");
    return;
  }

  try {
    const result = await prisma[tableName].createMany({
      data: recordsToRestore,
      skipDuplicates: true,
    });
    console.log(`  Restored ${result.count} records to ${tableName}`);
    console.log("");
    console.log(
      `Restore complete! ${result.count} records restored to "${tableName}".`,
    );
  } catch (e) {
    console.error(`  Restore failed: ${e.message}`);
    process.exitCode = 1;
  }

  // Check affected tables for cascade
  console.log("");
  console.log("Checking for cascade-affected tables...");
  const countsAfter = await getTableCounts();
  const affectedTables = CASCADE_RELATED_TABLES[tableName] || [];

  for (const affectedTable of affectedTables) {
    if (affectedTable === tableName) continue;
    const before = countsBefore[affectedTable] || 0;
    const after = countsAfter[affectedTable] || 0;
    const backupCount = (backupData[affectedTable] || []).length;

    if (before !== after) {
      console.log(`  ${affectedTable}: changed from ${before} to ${after} (backup has ${backupCount})`);
      if (backupCount !== after && backupCount > 0) {
        const shouldRestore = await confirmPrompt(`  Table '${affectedTable}' has different count. Restore ${backupCount} records from backup?`);
        if (shouldRestore) {
          console.log(`  Restoring ${affectedTable}...`);
          const affectedRecords = backupData[affectedTable];
          try {
            const result = await prisma[affectedTable].createMany({
              data: affectedRecords,
              skipDuplicates: true,
            });
            console.log(`    Restored ${result.count} records to ${affectedTable}`);
          } catch (e) {
            console.error(`    Failed to restore ${affectedTable}: ${e.message}`);
          }
        }
      }
    }
  }
}

async function restoreSingleTableWithoutDelete(filename, tableName) {
  let backupPath = path.join(BACKUPS_DIR, filename);

  if (!backupPath.endsWith(".json")) {
    backupPath += ".json";
  }

  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found: ${backupPath}`);
    console.log("Use --list to see available backups.");
    process.exit(1);
  }

  if (!MODELS.includes(tableName)) {
    console.error(`Invalid table name: ${tableName}`);
    console.log("Available tables: " + MODELS.join(", "));
    process.exit(1);
  }

  console.log(
    `Inserting records into "${tableName}" from: ${path.basename(backupPath)} (no delete - safe for cascade-affected tables)`,
  );
  console.log("");

  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  const records = backupData[tableName];

  if (!records || records.length === 0) {
    console.log(`No records found for table "${tableName}" in backup.`);
    return;
  }

  console.log(`Found ${records.length} records in backup for "${tableName}"`);

  try {
    const result = await prisma[tableName].createMany({
      data: records,
      skipDuplicates: true,
    });
    console.log(`  Inserted ${result.count} records into ${tableName}`);
    console.log("");
    console.log(
      `Done! ${result.count} records inserted into "${tableName}".`,
    );
  } catch (e) {
    console.error(`  Insert failed: ${e.message}`);
    process.exitCode = 1;
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === "--list" || command === "-l") {
      await listBackups();
    } else if (command === "--info" || command === "-i") {
      let filename = args[1];
      if (!filename) {
        filename = getLatestBackup();
        if (!filename) {
          console.error("No backups found.");
          process.exit(1);
        }
      }
      await showBackupInfo(filename);
    } else if (command === "--restore" || command === "-r") {
      let filename = args[1];
      let tableName = null;

      // If first arg is a table name (not a backup file), use latest backup
      if (args[1] && MODELS.includes(args[1])) {
        tableName = args[1];
        filename = getLatestBackup();
        if (!filename) {
          console.error("No backups found.");
          process.exit(1);
        }
      } else if (!args[1]) {
        // No arg provided, use latest backup
        filename = getLatestBackup();
        if (!filename) {
          console.error("No backups found.");
          process.exit(1);
        }
      }

      // Check for --no-preserve flag (default preserves users 1-5)
      const preserveIds = args.includes("--no-preserve")
        ? []
        : DEFAULT_PRESERVED_USER_IDS;

      // Restore specific table or full backup
      if (tableName || (args[2] && MODELS.includes(args[2]))) {
        const targetTable = tableName || args[2];
        await restoreSingleTable(filename, targetTable, preserveIds);
      } else {
        await restoreBackup(filename, preserveIds);
      }
    } else if (command === "--backup" || command === "-b") {
      if (!args[1]) {
        console.error("Please specify a table name.");
        console.log("Usage: node scripts/backup-db.js --backup <table>");
        console.log("Available tables: " + MODELS.join(", "));
        process.exit(1);
      }
      const modelName = args[1];
      if (!MODELS.includes(modelName)) {
        console.error(`Invalid table name: ${modelName}`);
        console.log("Available tables: " + MODELS.join(", "));
        process.exit(1);
      }
      await backupSingleModel(modelName);
    } else if (command === "--restore-only") {
      if (!args[1]) {
        console.error("Please specify at least one table name.");
        console.log("Usage: node scripts/backup-db.js --restore-only <table> [<table>...]");
        console.log("Available tables: " + MODELS.join(", "));
        process.exit(1);
      }
      const tableNames = args.slice(1);
      const invalidTables = tableNames.filter((t) => !MODELS.includes(t));
      if (invalidTables.length > 0) {
        console.error(`Invalid table names: ${invalidTables.join(", ")}`);
        console.log("Available tables: " + MODELS.join(", "));
        process.exit(1);
      }
      const filename = getLatestBackup();
      if (!filename) {
        console.error("No backups found.");
        process.exit(1);
      }
      for (const tableName of tableNames) {
        await restoreSingleTableWithoutDelete(filename, tableName);
      }
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
