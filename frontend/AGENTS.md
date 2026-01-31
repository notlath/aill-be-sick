# AI'll Be Sick - Frontend

## Project Overview

AI'll Be Sick is an AI-assisted symptom checker and clinician dashboard application built with Next.js. The project enables users to input symptoms and receive AI-powered disease predictions for dengue, pneumonia, typhoid, and impetigo. It integrates with a Django backend for disease detection algorithms, handles user authentication via Supabase, and manages patient cases with detailed confidence and uncertainty metrics.

### Key Features

- **Disease Detection**: AI-powered symptom analysis with confidence/uncertainty scoring
- **User Authentication**: Secure login/signup with Supabase Auth
- **Role-Based Access**: Support for PATIENT, CLINICIAN, and DEVELOPER roles
- **Multi-language Models**: Supports BioClinical-ModernBERT and RoBERTa-Tagalog models
- **Real-time Analysis**: Integration with Django backend for symptom processing
- **Geolocation Support**: Tracks user location data for epidemiological analysis
- **Explanation Interface**: Provides model explainability for diagnosis decisions

### Architecture & Tech Stack

- **Framework**: Next.js 15.5.9 with App Router
- **Database**: PostgreSQL with Prisma ORM (v6.17.1)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS with DaisyUI components
- **HTTP Client**: Axios
- **State Management**: React Server Actions
- **Type Safety**: TypeScript
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation

## Building and Running

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Supabase project
- Backend Django server running on `http://localhost:8000` or custom backend URL
- Bun (optional, but available)

### Installation & Setup

1. Install dependencies:

```bash
npm install
# or
bun install
```

1. Configure environment variables in `.env.local`:

```env
DATABASE_URL="your_postgresql_connection_string"
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000" # Or your backend URL
```

1. Set up the database:

```bash
npx prisma generate
npx prisma db push
```

1. Run the development server:

```bash
npm run dev
# or with bun
bun dev
```

1. Application will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run Next.js linting
- `npm run seed:diagnoses` - Seed diagnosis data (uses custom script)

## Project Structure

```
frontend/
├── actions/                 # Server actions for authentication, diagnosis, and chat
│   ├── client.ts           # Action client setup
│   ├── create-chat.ts      # Chat creation logic
│   ├── create-diagnosis.ts # Diagnosis creation
│   ├── create-message.ts   # Message creation
│   ├── email-auth.ts       # Email authentication
│   ├── explain-diagnosis.ts # Diagnosis explanation
│   ├── get-follow-up-question.ts # Follow-up questions
│   └── run-diagnosis.ts    # Main diagnosis algorithm integration
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/             # Authentication-related pages
│   ├── api/                # API routes
│   ├── comparison/         # Comparison views
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/            # Reusable React components
├── constants/             # Constant values
├── hooks/                 # Custom React hooks
├── lib/                   # Library utilities
├── prisma/                # Prisma schema and migrations
├── utils/                 # Utility functions
│   ├── supabase/          # Supabase client implementations
│   ├── auth.ts            # Authentication helpers
│   ├── chat.ts            # Chat utilities
│   ├── diagnosis.ts       # Diagnosis utilities
│   ├── explanation.ts     # Explanation utilities
│   ├── lib.ts             # General utilities
│   ├── location.ts        # Location utilities
│   ├── message.ts         # Message utilities
│   └── user.ts            # User utilities
├── schemas/               # Zod validation schemas
├── declaration.d.ts       # Type declarations
├── middleware.ts          # Next.js middleware (Supabase session management)
├── next.config.ts         # Next.js configuration
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Database Schema

The application uses PostgreSQL with Prisma ORM and has the following key models:

- **User**: Manages user accounts with email, name, role, and location data
  - Roles: PATIENT, CLINICIAN, DEVELOPER
  - Includes location fields (city, region, coordinates) and demographic data
  - Related to chats and diagnoses

- **Chat**: Conversational sessions between users and AI
  - Contains messages and optional diagnosis links
  - Connected to users and temporary diagnoses

- **Message**: Individual chat messages with roles and types
  - Types: SYMPTOMS, ANSWER, QUESTION, DIAGNOSIS, URGENT_WARNING, ERROR
  - Can be linked to temporary diagnoses or explanations

- **TempDiagnosis**: Temporary diagnosis suggestions during conversations
  - Includes confidence, uncertainty scores and disease prediction
  - Linked to specific messages in chats

- **Diagnosis**: Confirmed diagnoses with detailed metrics
  - Contains confidence, uncertainty, disease, model used, and location data
  - Links to both user and chat

- **Explanation**: Model explainability data (using SHAP values)
  - Token importance scores for interpretation
  - Links to diagnoses or messages

Models support multiple diseases (DENGUE, PNEUMONIA, TYPHOID, IMPETIGO) and AI models (BioClinical-ModernBERT, RoBERTa-Tagalog).

## Key Pages & Routes

- `/` - Home page redirects users based on role (patients to /diagnosis, clinicians to /dashboard)
- `/new` - Symptom input page for disease detection
- `/login` - User authentication page
- `/dashboard` - Clinician dashboard (for CLINICIAN role)
- `/diagnosis` - Patient diagnosis interface (for PATIENT role)
- `/comparison` - Comparison views

## API Integration

The frontend communicates with the Django backend for disease detection:

- **Endpoint**: `POST http://localhost:8000/diagnosis/new` (configurable via NEXT_PUBLIC_BACKEND_URL)
- **Payload**: `{ "symptoms": ["symptom1", "symptom2", ...] }`
- **Response**: Contains disease prediction, confidence, uncertainty, probability distributions, and model metadata
- The system evaluates confidence and uncertainty scores to determine if results should be presented to users
- Different confidence/uncertainty combinations provide different messaging to users regarding reliability

## Authentication Flow

- Supabase handles user authentication
- Middleware protects routes and updates sessions
- Server actions verify authenticated users via `getCurrentDbUser()`
- Role-based redirection occurs on the home page

## Development Conventions

- Server Actions are used extensively for data mutations
- Zod schemas validate input data for server actions
- TypeScript is used throughout the application
- Tailwind CSS with DaisyUI for consistent styling
- Prisma is used with the Next.js workaround plugin for monorepo compatibility
- Error handling follows a pattern with success/error return objects

### Data Fetching

- **ALWAYS** fetch data directly within Server Components or Server Actions using Prisma.
- **NEVER** use `useEffect` or client-side fetching mechanisms for initial data loads that can be done on the server.
- **ALWAYS** use `revalidatePath` or `revalidateTag` from `next/cache` for revalidating cached data after mutations.
- **Example (Server Component):**
  ```typescript
  // app/dashboard/page.tsx
  import prisma from '@/lib/prisma';

  async function DashboardPage() {
    const patients = await prisma.patient.findMany();
    return (
      {/* ... render patients ... */}
    );
  }
  ```

### Data Mutation with Server Actions

The project uses `next-safe-action` to create type-safe server actions. This library enforces a strict pattern for defining actions, handling input validation with Zod, and returning structured responses.

- **ALWAYS** perform data mutations using the `next-safe-action` pattern. This is the established convention in the project.
- **NEVER** expose direct API endpoints for mutations; use a Server Action instead.
- **ALWAYS** define a Zod schema for the action's input in the `/schemas` directory.
- **ALWAYS** create the server action in the `/actions` directory.
- **ALWAYS** use the `actionClient` from `/actions/client.ts` to build the action.
- **ALWAYS** chain the `.inputSchema()` method with your Zod schema and the `.action()` method containing the logic.
- **ALWAYS** revalidate the necessary data path using `revalidatePath` from `next/cache` after a successful mutation.

**Example: Creating a new Patient**

1.  **Define the Schema (in `schemas/CreatePatientSchema.ts`)**

    ```typescript
    import * as z from "zod";

    export const CreatePatientSchema = z.object({
      name: z.string().min(1, "Patient name is required"),
      email: z.string().email("Invalid email address"),
    });
    ```

2.  **Define the Server Action (in `actions/create-patient.ts`)**

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
            data: {
              name,
              email,
            },
          });

          // Revalidate the dashboard to show the new patient
          revalidatePath("/dashboard");

          return { success: newPatient };
        } catch (error) {
          console.error(`Error creating new patient: ${error}`);
          return { error: "Failed to create new patient." };
        }
      });
    ```

3.  **Using the Action in a Client Component**

    ```tsx
    // In a form component
    import { useAction } from "next-safe-action/hooks";
    import { createPatient } from "@/actions/create-patient";

    function PatientForm() {
      const { execute, status } = useAction(createPatient, {
        onSuccess: (data) => {
          console.log("Patient created successfully:", data);
        },
        onError: (error) => {
          console.error("Failed to create patient:", error);
        },
      });

      const onSubmit = (formData: FormData) => {
        // next-safe-action can directly take the schema type
        // For simplicity with forms, you might construct the object
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        execute({ name, email });
      };

      return (
        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}>
          {/* ... form fields for name and email ... */}
          <button type="submit" disabled={status === 'executing'}>
            {status === 'executing' ? "Creating..." : "Create Patient"}
          </button>
        </form>
      );
    }
    ```


## Testing & Quality Assurance

While no explicit test files were visible during the analysis, the codebase includes:

- Zod validation schemas for input validation
- Error handling in server actions
- Type safety through TypeScript
- Confidence/uncertainty metrics to assess AI prediction reliability

## Common Issues & Troubleshooting

1. **Database Connection Errors**: Verify your `DATABASE_URL` in environment variables
2. **Supabase Authentication Issues**: Check Supabase URL and ANON key
3. **Backend Connection Errors**: Ensure the Django server is running at the configured URL
4. **Prisma Client Errors**: Run `npx prisma generate` to regenerate the client
5. **Model Confidence Issues**: The system shows different warning messages based on confidence/uncertainty combinations

## Styling Guidelines

The project follows strict DaisyUI styling policies:

### DaisyUI Only Policy

- **ALWAYS use DaisyUI components and classes** (buttons, cards, modals, alerts, badges, etc.)
- **NEVER use custom Tailwind classes for styling** (no custom gradients, shadows, transitions)
- **Use Lucide React for icons** - import from `lucide-react`
- **NEVER create custom gradients or effects** - use DaisyUI's built-in options

### Common DaisyUI Classes

- **Buttons**: `btn`, `btn-primary`, `btn-secondary`, `btn-success`, `btn-ghost`, `btn-outline`
- **Cards**: `card`, `card-body`, `card-title`, `card-actions`
- **Modals**: `modal`, `modal-box`, `modal-backdrop`, `modal-open`
- **Alerts**: `alert`, `alert-info`, `alert-success`, `alert-warning`, `alert-error`
- **Badges**: `badge`, `badge-primary`, `badge-secondary`, `badge-outline`
- **Layout**: `bg-base-100`, `bg-base-200`, `bg-base-300`, `text-base-content`

### Example - Correct usage

```tsx
<button className="btn btn-success btn-lg">Click me</button>
```

### Navigation Links

When creating new sidebar navigation items:

- Always copy the design from existing `nav-link.tsx`
- Use the same styling structure, icon sizes (`size-4.5`), and animation curves
- Maintain consistency with icon containers and hover effects
- Use the same styling structure with:
  - Icon container with hover effects and transitions
  - Gradient overlay on hover
  - Active state handling
  - Consistent spacing and sizing
- Maintain the same animation curve: `ease-[cubic-bezier(0.32,0.72,0,1)]`
- Keep icon size consistent: `size-4.5` with `strokeWidth={2.5}`

### When in doubt

- Check [DaisyUI documentation](https://daisyui.com/components/)
- Use DaisyUI's pre-built components and utilities
- Keep it simple with DaisyUI classes
