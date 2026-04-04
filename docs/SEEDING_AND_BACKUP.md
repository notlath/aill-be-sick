# Database Seeding & Backup Guide

Developer documentation for managing patient data, reseeding diagnoses, and creating database backups.

---

## Why Backup Matters

This project uses Supabase's free tier, which does **not** include automated database backups. If data is lost (accidental deletions, schema migrations gone wrong, seed script errors), there is no cloud-based recovery option.

**Always create a backup before:**

- Running seed scripts (`seed-realistic.js`, `clear-patients.js`)
- Running Prisma migrations (`npx prisma migrate`)
- Making schema changes
- Any bulk database operation

---

## Database Backup

### Creating a Backup

Run the backup script to export all database tables to a timestamped JSON + gzip file:

```bash
npm run db:backup
```

This creates a backup file in `frontend/backups/` with a timestamped filename (e.g., `backup-2024-01-15T10-30-00.json.gz`). The `backups/` folder is **gitignored**, so each developer's local backups are isolated — no merge conflicts or repo bloat.

The backup exports all 14 tables: User, Chat, Message, Diagnosis, TempDiagnosis, Explanation, Alert, AlertNote, AllowedClinicianEmail, DiagnosisNote, AuditLog, DeletionSchedule, DiagnosisSession, DiagnosisOverride.

### Listing Backups

To see all available backups:

```bash
npm run db:backup:list
```

### Restoring a Backup

To restore from a specific backup file:

```bash
npm run db:backup:restore backup-2024-01-15T10-30-00.json.gz
```

You must provide the exact filename. The restore operation will **replace all existing data** in the database with the backup contents.

---

## Reseeding Patient Data

### What `seed-realistic.js` Does

The `seed-realistic.js` script creates **500 PATIENT users** with realistic data including:

- User accounts with PATIENT role
- Chat sessions and messages
- Diagnosis records with confidence/uncertainty scores
- Outbreak pattern data (disease distribution mimics real epidemiological patterns)

### What It Does NOT Touch

The script **only** modifies:

- `User` table (PATIENT role only)
- `Chat` table
- `Message` table
- `Diagnosis` table
- `TempDiagnosis` table

It does **NOT** create or modify:

- Alerts or alert notes
- Clinician/Admin/Developer accounts
- Allowed clinician emails
- Diagnosis notes
- Audit logs
- Deletion schedules
- Diagnosis sessions
- Diagnosis overrides
- Explanations

**Clinician accounts, admin data, and alert configurations are completely safe during reseeding.**

### How It Preserves Non-PATIENT Accounts

The script dynamically looks up all non-PATIENT users and preserves them. It uses a `PRESERVE_USER_IDS` constant to ensure specific accounts are never deleted. Only PATIENT-role users are removed before reseeding.

### Seeding Behavior

- **First 10 diagnoses**: Created with `PENDING` status (useful for testing clinician approval workflows)
- **Remaining diagnoses**: Created with `VERIFIED` status
- Existing PATIENT users are deleted before seeding (clean slate)

### Running the Seed Script

```bash
npm run seed:realistic
```

This requires `.env.local` to be configured with a valid `DATABASE_URL`.

---

## Clearing Patient Data

### What `clear-patients.js` Does

This is the **nuclear option** — it deletes **ALL PATIENT users** from the database with no preservation.

### How It Differs from `seed-realistic.js`

- `seed-realistic.js` deletes PATIENT users then creates 500 new ones
- `clear-patients.js` only deletes — no new data is created
- `clear-patients.js` does NOT dynamically preserve specific users (unlike seed-realistic.js)

### Running the Clear Script

```bash
node scripts/clear-patients.js
```

**Warning**: This is more destructive than `seed-realistic.js`. Make sure you have a backup if you need to recover patient data.

---

## Recommended Workflows

### Before Seeding

```bash
# 1. Create a backup first
npm run db:backup

# 2. Then run the seed script
npm run seed:realistic
```

### Before Schema Changes

```bash
# 1. Create a backup
npm run db:backup

# 2. Run your migration
npx prisma migrate dev

# 3. Verify the migration worked
# 4. If something went wrong, restore
npm run db:backup:restore <backup-filename>
```

### Regular Backup Cadence

Consider creating backups:

- **Before each development session** that involves database work
- **Weekly** if you're actively developing features that touch the database
- **Before sharing data** with team members (export your state for them to import)

### Local Backups Are Isolated

The `frontend/backups/` folder is **gitignored**. This means:

- Each developer has their own local backup files
- No merge conflicts from backup files
- No repository bloat from committed JSON/gzip files
- If you need to share a backup with a teammate, you'll need to send the file directly

---

## Quick Reference

| Task                  | Command                                               |
| --------------------- | ----------------------------------------------------- |
| Create backup         | `npm run db:backup`                                   |
| List backups          | `npm run db:backup:list`                              |
| Restore backup        | `npm run db:backup:restore <filename>`                |
| Seed 500 patients     | `npm run seed:realistic`                              |
| Clear all patients    | `node scripts/clear-patients.js`                      |
| Seed diagnosis types  | `npm run seed:diagnoses`                              |
| Run Prisma migration  | `npx prisma migrate dev`                              |
| Regenerate Prisma     | `npx prisma generate`                                 |
