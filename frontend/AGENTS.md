# AI'll Be Sick — Frontend Agent Guide

This file covers frontend-specific guidance for AI-assisted development. For shared conventions (role hierarchy, styling, copywriting, database operations, git workflow), see the root [`AGENTS.md`](../AGENTS.md).

---

## ⚠️ MANDATORY PRE-COMPLETION CHECKLIST

**BEFORE calling `attempt_completion`, you MUST verify ALL items below.**

### Documentation Sync (CRITICAL)

- [ ] **If you created/modified/deleted ANY App Router page** → Update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md`
- [ ] **If you changed navigation links, redirects, or guards** → Update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md`
- [ ] **If you modified auth flows or role access** → Update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md` AND `docs/ACCOUNT_CREATION_FLOWCHART.md`
- [ ] **If you changed account creation/login flows** → Update `docs/ACCOUNT_CREATION_FLOWCHART.md`

### Code Quality

- [ ] `npx tsc --noEmit` passes (TypeScript check)
- [ ] Frontend mutations follow schema + server-action pattern
- [ ] `revalidatePath`/`revalidateTag` applied after mutations
- [ ] No duplicated code blocks — search for repeated logic that should be extracted into shared utilities

### User-Facing Content

- [ ] Medical text is plain-language, calm, and non-absolute
- [ ] UI changes are mobile-usable at small breakpoints
- [ ] No contradictory style guidance introduced

**These checks are NOT optional. Complete them before every task completion.**

---

## Project Overview

AI'll Be Sick is an AI-assisted symptom checker and clinician dashboard application built with Next.js. The project enables users to input symptoms and receive AI-powered disease predictions for dengue, pneumonia, typhoid, measles, influenza, and diarrhea. It integrates with a Flask backend for disease detection algorithms, handles user authentication via Supabase, and manages patient cases with detailed confidence and uncertainty metrics.

### Key Features

- **Disease Detection**: AI-powered symptom analysis with confidence/uncertainty scoring
- **User Authentication**: Secure login/signup with Supabase Auth
- **Role-Based Access**: Support for PATIENT, CLINICIAN, ADMIN, and DEVELOPER roles (hierarchical)
- **Multi-language Models**: Supports BioClinical-ModernBERT and RoBERTa-Tagalog models
- **Real-time Analysis**: Integration with Flask backend for symptom processing
- **Geolocation Support**: Tracks user location data for epidemiological analysis
- **Explanation Interface**: Provides model explainability for diagnosis decisions
- **Epidemiological Surveillance**: Clinician dashboards with maps, alerts, and outbreak detection

### Architecture & Tech Stack

| Layer              | Technology                                    |
| ------------------ | --------------------------------------------- |
| Framework          | Next.js 16.1.6 with App Router                |
| Runtime            | React 19.1.0                                  |
| Language           | TypeScript 5.9.3                              |
| Database           | PostgreSQL (Supabase) + Prisma ORM v6.19.2    |
| Authentication     | Supabase Auth (@supabase/ssr, @supabase/supabase-js) |
| Styling            | Tailwind CSS v4.2.1 + DaisyUI v5.5.19         |
| State Management   | Zustand v5.0.11                               |
| Forms              | React Hook Form + Zod v4.3.6                  |
| HTTP Client        | Axios                                         |
| Icons              | Lucide React                                  |
| Charts             | D3 v7.9.0, Recharts v3.7.0                    |
| Maps               | Leaflet v1.9.4 + Mapbox                       |
| AI                 | Google Generative AI SDK v0.24.1              |
| Testing            | Vitest v4.1.2                                 |
| PDF Export         | jsPDF + jspdf-autotable                       |
| Markdown           | react-markdown + remark-breaks                |
| Notifications      | Sonner                                        |
| Tables             | @tanstack/react-table                         |
| Geo Analysis       | @turf/turf                                    |

### Skill Files

For AI-assisted frontend work, use:

- `frontend/.github/skills/medical-diagnosis-actions/SKILL.md` for server actions, Zod schemas, and diagnosis flow changes.
- `frontend/.github/skills/clinical-copywriting/SKILL.md` for patient/clinician-facing medical copy updates.
- `frontend/.github/skills/d3-viz/SKILL.md` for custom D3/map/chart visualization work.

---

## Building and Running

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase)
- Supabase project
- Backend Flask server running on `http://localhost:10000` or custom backend URL
- Bun (recommended) or npm

### Installation & Setup

1. Install dependencies:

```bash
bun install
```

2. Configure environment variables in `.env.local` (see root `AGENTS.md` for full list):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?pgbouncer=true
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
NEXT_PUBLIC_BACKEND_URL=http://localhost:10000
NEXT_PUBLIC_DIAGNOSIS_MODE=adaptive
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Set up the database:

```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:

```bash
bun dev
```

5. Application will be available at `http://localhost:3000`

### Available Scripts

| Script                     | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| `bun run dev`              | Start development server with Turbopack                    |
| `bun run build`            | Production build                                           |
| `bun run start`            | Production server                                          |
| `bun run lint`             | Next.js linting                                            |
| `npx tsc --noEmit`         | TypeScript type check (run before committing)              |
| `bun run seed:diagnoses`   | Seed diagnosis data                                        |
| `bun run seed:users`       | Seed user data                                             |
| `bun run seed:realistic`   | Seed realistic patient/diagnosis data (requires .env.local)|
| `bun run db:backup`        | Export database backup                                     |
| `bun run db:backup:list`   | List available backups                                     |
| `bun run db:backup:restore`| Restore from a backup                                      |
| `bun run db:backfill-consent`| Backfill consent records for existing users              |

---

## Project Structure

```
frontend/
├── actions/                  # Server actions (mutations) using next-safe-action
│   ├── client.ts            # Action client setup
│   ├── create-chat.ts       # Chat creation logic
│   ├── auto-record-diagnosis.ts  # Auto-record diagnosis
│   ├── create-message.ts    # Message creation
│   ├── email-auth.ts        # Email authentication
│   ├── explain-diagnosis.ts # Diagnosis explanation
│   ├── get-follow-up-question.ts  # Follow-up questions
│   └── run-diagnosis.ts     # Main diagnosis algorithm integration
├── app/                     # Next.js App Router pages and layouts
│   ├── (app)/
│   │   ├── (clinician)/     # Clinician route group (protected)
│   │   │   ├── alerts/
│   │   │   ├── clinician-profile/
│   │   │   ├── create-patient/
│   │   │   ├── dashboard/
│   │   │   ├── healthcare-reports/
│   │   │   ├── map/
│   │   │   ├── pending-clinicians/
│   │   │   └── users/
│   │   └── (patient)/       # Patient route group (protected)
│   │       ├── diagnosis/
│   │       ├── history/
│   │       └── profile/
│   ├── (auth)/              # Auth route group (public)
│   │   ├── login/
│   │   ├── clinician-login/
│   │   ├── admin-login/
│   │   ├── onboarding/
│   │   ├── privacy/
│   │   ├── terms/
│   │   └── ...
│   ├── auth/                # Supabase auth callbacks
│   ├── comparison/
│   ├── privacy-rights/
│   ├── layout.tsx
│   └── page.tsx
├── components/              # Reusable React components
│   ├── ui/                  # Base UI components (Card, Tabs, etc.)
│   ├── clinicians/          # Clinician-specific components
│   ├── patients/            # Patient-specific components
│   └── shared/              # Shared components
├── constants/               # Constant values
├── hooks/                   # Custom React hooks
├── lib/                     # Library utilities (including generated Prisma)
│   └── generated/prisma/    # Generated Prisma client
├── schemas/                 # Zod validation schemas
├── stores/                  # Zustand state stores
├── types/                   # TypeScript type definitions
├── utils/                   # Utility functions
│   ├── supabase/            # Supabase client implementations
│   ├── auth.ts              # Authentication helpers
│   ├── chat.ts              # Chat utilities
│   ├── diagnosis.ts         # Diagnosis utilities
│   ├── explanation.ts       # Explanation utilities
│   ├── lib.ts               # General utilities
│   ├── location.ts          # Location utilities
│   ├── message.ts           # Message utilities
│   ├── role-hierarchy.ts    # Role permission checks
│   └── user.ts              # User utilities
├── prisma/
│   └── schema.prisma        # Database schema
├── middleware.ts             # Supabase session middleware
├── next.config.ts            # Next.js configuration
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

---

## Key Pages & Routes

### Patient Routes (`(app)/(patient)/`)

| Route          | Description                                    |
| -------------- | ---------------------------------------------- |
| `/diagnosis`   | Patient diagnosis interface                    |
| `/history`     | User's diagnosis history                       |
| `/profile`     | User profile management                        |

### Clinician Routes (`(app)/(clinician)/`)

| Route                  | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `/dashboard`           | Clinician dashboard with analytics             |
| `/alerts`              | Outbreak/anomaly alerts management             |
| `/create-patient`      | Create patient accounts                        |
| `/users`               | User management                                |
| `/map`                 | Geographic disease visualization               |
| `/healthcare-reports`  | Generate and view reports                      |
| `/pending-clinicians`  | Approve/reject clinician signups (ADMIN)       |
| `/clinician-profile`   | Clinician profile management                   |

### Auth Routes (`(auth)/`)

| Route                      | Description                                    |
| -------------------------- | ---------------------------------------------- |
| `/login`                   | Patient login                                  |
| `/clinician-login`         | Clinician login                                |
| `/admin-login`             | Admin login                                    |
| `/onboarding`              | New user onboarding                            |
| `/privacy`                 | Privacy policy acceptance                      |
| `/terms`                   | Terms of service acceptance                    |
| `/waiting-for-approval`    | Pending clinician approval screen              |
| `/need-account`            | Account creation info                          |

### Navigation Documentation Sync (Required)

- If any frontend change affects App Router paths, redirects, role-based guards, or visible navigation links/actions, update `docs/SYSTEM_PAGE_NAVIGATION_FLOWCHART.md` in the same PR.
- Treat the flowchart doc as a required sync artifact for route/navigation behavior changes, not optional documentation.
- Validate Mermaid syntax after updates to avoid broken diagrams.

---

## API Integration

The frontend communicates with the Flask backend for disease detection:

- **Endpoint**: `POST http://localhost:10000/diagnosis/new` (configurable via `NEXT_PUBLIC_BACKEND_URL`)
- **Payload**: `{ "symptoms": ["symptom1", "symptom2", ...] }`
- **Response**: Contains disease prediction, confidence, uncertainty, probability distributions, and model metadata
- The system evaluates confidence and uncertainty scores to determine if results should be presented to users
- Different confidence/uncertainty combinations provide different messaging to users regarding reliability

---

## Authentication Flow

- Supabase handles user authentication
- Middleware (`middleware.ts`) protects routes and updates sessions
- Server actions verify authenticated users via `getCurrentDbUser()`
- Role-based redirection occurs on the home page
- See root `AGENTS.md` for role hierarchy and permission mapping

---

## Development Conventions

### Component Structure

- **Server Components**: Default for pages and layouts; fetch data directly from the database
- **Client Components**: Used for interactive elements; indicated with `"use client"` directive
- **Naming Conventions**: `PascalCase` for components, `kebab-case` for files, arrow functions for component definitions.

```tsx
// Server Component (default)
const ServerComponent = async () => {
  const data = await fetchDataFromDatabase();
  return <ClientComponent data={data} />;
};

export default ServerComponent;
```

```tsx
// Client Component
"use client";

import { useState } from "react";

const ClientComponent = ({ data }: { data: DataType }) => {
  const [state, setState] = useState(initialState);
  return <div>{/* Render UI */}</div>;
};

export default ClientComponent;
```

### Data Fetching

- **ALWAYS** fetch data directly within Server Components using Prisma.
- **NEVER** use `useEffect` or client-side fetching mechanisms for initial data loads that can be done on the server.
- **ALWAYS** use `revalidatePath` or `revalidateTag` from `next/cache` for revalidating cached data after mutations.
- **NEVER** use Server Actions for data fetching; they are strictly for mutations.
- **ALWAYS** put data fetching logic files in the `@/utils/` directory.

```typescript
// app/dashboard/page.tsx
import prisma from "@/lib/prisma";

async function DashboardPage() {
  const patients = await prisma.patient.findMany();
  return <PatientList patients={patients} />;
}
```

### Data Mutation with Server Actions

The project uses `next-safe-action` to create type-safe server actions.

- **ALWAYS** perform data mutations using the `next-safe-action` pattern.
- **NEVER** expose direct API endpoints for mutations; use a Server Action instead.
- **ALWAYS** define a Zod schema for the action's input in the `/schemas` directory.
- **ALWAYS** create the server action in the `/actions` directory.
- **ALWAYS** use the `actionClient` from `/actions/client.ts` to build the action.
- **ALWAYS** chain the `.inputSchema()` method with your Zod schema and the `.action()` method containing the logic.
- **ALWAYS** revalidate the necessary data path using `revalidatePath` from `next/cache` after a successful mutation.

**Example: Creating a new Patient**

1. **Define the Schema (in `schemas/CreatePatientSchema.ts`)**

   ```typescript
   import * as z from "zod";

   export const CreatePatientSchema = z.object({
     name: z.string().min(1, "Patient name is required"),
     email: z.string().email("Invalid email address"),
   });
   ```

2. **Define the Server Action (in `actions/create-patient.ts`)**

   ```typescript
   "use server";

   import { actionClient } from "./client";
   import { CreatePatientSchema } from "@/schemas/CreatePatientSchema";
   import prisma from "@/prisma/prisma";
   import { revalidatePath } from "next/cache";

   export const createPatient = actionClient
     .inputSchema(CreatePatientSchema)
     .action(async ({ parsedInput }) => {
       const { name, email } = parsedInput;

       try {
         const newPatient = await prisma.patient.create({
           data: { name, email },
         });

         revalidatePath("/dashboard");

         return { success: newPatient };
       } catch (error) {
         console.error(`Error creating new patient: ${error}`);
         return { error: "Failed to create new patient." };
       }
     });
   ```

3. **Using the Action in a Client Component**

   ```tsx
   import { useAction } from "next-safe-action/hooks";
   import { createPatient } from "@/actions/create-patient";

   function PatientForm() {
     const { execute, status } = useAction(createPatient, {
       onSuccess: (data) => {
         console.log("Patient created successfully:", data);
       },
       onError: (error) => {
         console.error("Failed to register patient:", error);
       },
     });

     const onSubmit = (formData: FormData) => {
       const name = formData.get("name") as string;
       const email = formData.get("email") as string;
       execute({ name, email });
     };

     return (
       <form
         onSubmit={(e) => {
           e.preventDefault();
           onSubmit(new FormData(e.currentTarget));
         }}
       >
         {/* ... form fields ... */}
         <button type="submit" disabled={status === "executing"}>
           {status === "executing" ? "Registering..." : "Register Patient"}
         </button>
       </form>
     );
   }
   ```

---

## Styling Guidelines

The project uses **Tailwind CSS with DaisyUI** and reusable components in `@/components/ui`.

- **ALWAYS** prefer composing existing reusable components from `@/components/ui`.
- **ALWAYS** use DaisyUI component classes for common UI primitives.
- **USE** Tailwind utility classes for layout/spacing only when needed.
- **USE** `lucide-react` for icons, importing from `lucide-react`.
- **NEVER** create custom gradients or shadows that bypass DaisyUI's system.

### Navigation Links

When creating new sidebar navigation items:

- Always copy the design from existing `nav-link.tsx`
- Icon size: `size-4.5` with `strokeWidth={2.5}`
- Animation curve: `ease-[cubic-bezier(0.32,0.72,0,1)]`
- Include: hover gradient overlay, active state handling, consistent spacing

### Card Components

When creating new card-based UI elements:

- **ALWAYS** use the `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, and `<CardContent>` components from `@/components/ui/card`.
- For prominent headers, use a `flex` layout with a decorative icon container next to the title.
- Icon container: soft gradient background (e.g., `from-primary/10 to-primary/5`), padding (e.g., `p-3`), rounded corners (e.g., `rounded-[12px]`).
- Icons: consistent size (e.g., `size-6`), color (e.g., `text-primary`), stroke width (e.g., `stroke-[2]`).
- Add subtle hover effect: `className="group hover:border-primary/30"`.

### Tabbed Interfaces

For tabbed navigation:

- **ALWAYS** use the `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, and `<TabsContent>` components from `@/components/ui/tabs`.
- Full-width tabs: apply `grid` layout to `<TabsList>` (e.g., `className="grid w-full grid-cols-4 h-auto"`).
- Ensure each `<TabsTrigger>` has a corresponding `<TabsContent>` panel linked by the `value` prop.

---

## Copywriting Guidelines

See root `AGENTS.md` for full copywriting guidelines. Key points:

- **ALWAYS** review all user-facing copy for clarity, grammar, and spelling before shipping.
- Use plain, readable language; keep sentences short; explain medical terms simply.
- Maintain a calm, supportive, professional tone; avoid slang, sarcasm, and fear-inducing wording.
- **NEVER** make absolute diagnosis claims or imply guaranteed outcomes.
- **NEVER** use the word "cluster" in user-facing text — use "group" instead.
- Prefer clear, action-oriented text that helps users understand the next step.

---

## Role Hierarchy

See root `AGENTS.md` for full role hierarchy and permission mapping. Key implementation:

```typescript
import {
  canCreatePatient,
  canOverrideDiagnosis,
  canManageClinicians,
} from "@/utils/role-hierarchy";

// For clinician-level actions (patient creation, diagnosis override)
if (!canCreatePatient(user.role)) {
  return { error: "Permission denied" };
}

// For admin-only actions (clinician management)
if (!canManageClinicians(user.role)) {
  return { error: "Admin access required" };
}
```

**Key patterns:**

1. **Hierarchical role check**: Use `allowedRoles = ["CLINICIAN", "ADMIN", "DEVELOPER"]` for clinician-level permissions
2. **Conditional approval status**: Only check `approvalStatus === "ACTIVE"` for CLINICIAN role, not ADMIN/DEVELOPER
3. **Avoid strict equality**: Never use `role !== "CLINICIAN"` — it excludes ADMIN and DEVELOPER
4. **Use shared utilities**: Import from `@/utils/role-hierarchy.ts` for consistent permission checks

---

## Testing & Quality Assurance

- **Test runner**: Vitest v4.1.2
- **Validation**: Zod schemas for all server action inputs
- **Type safety**: TypeScript throughout (`npx tsc --noEmit` before committing)
- **Error handling**: Success/error return objects in all server actions
- **Confidence/uncertainty metrics**: Assess AI prediction reliability

---

## Common Issues & Troubleshooting

| Problem                      | Solution                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| Database connection error    | Check `DATABASE_URL` in `.env.local`                                                       |
| Supabase auth failure        | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`                       |
| Backend connection error     | Ensure Flask server is running at `http://localhost:10000` (or configured `NEXT_PUBLIC_BACKEND_URL`) |
| Prisma client errors         | Run `npx prisma generate`                                                                  |
| Model confidence warnings    | System shows different warning messages based on confidence/uncertainty combinations       |
| Map not rendering            | Check `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`                                           |
| Migration failures           | Use `DIRECT_URL` or `DIRECT_DATABASE_URL` for migrations, not `DATABASE_URL` (pgBouncer)   |

---

## Database Operations & Backup Reminders

See root `AGENTS.md` for full database operations guidelines. Key points:

- **ALWAYS** remind the developer to create a backup before destructive operations: `bun run db:backup`
- **Reference**: `docs/SEEDING_AND_BACKUP.md`
- **NEVER** automatically run backup commands

### Schema Change & Backup Sync

When modifying `frontend/prisma/schema.prisma`:

- Review `frontend/scripts/backup-db.js` and assess if schema modifications affect backup/restore logic
- Update the backup script if new tables, renamed fields, or removed columns require changes
- Verify that backup and restore still work end-to-end after schema changes

### Code Duplication Guard

- **MUST** actively check for and eliminate duplicated code
- Search existing files for similar logic that could be reused
- Extract repeated patterns into shared utility functions or helpers
- Never copy-paste blocks of code that already exist elsewhere
- Prefer DRY (Don't Repeat Yourself) principles across all layers
