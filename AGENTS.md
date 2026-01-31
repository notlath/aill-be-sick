# AI'll Be Sick Overview

This document provides a high-level overview of the project, focusing on the repository's structure, technologies, and purpose. It is intended to be used as a reference for developers and contributors.

## Project Overview

This repository contains a full-stack application for disease detection based on symptoms. The application is built with a Flask backend and a Next.js (App Router) frontend. It uses TypeScript, Prisma, and Supabase for the database and authentication.

The project is divided into two main parts:

-   **`backend/`**: A Flask REST API that processes symptoms and returns disease predictions.
-   **`frontend/`**: A Next.js application that provides the user interface for the application.

### Architecture

-   **Backend**: Flask REST API
-   **Frontend**: Next.js App Router
-   **Database**: PostgreSQL with Prisma ORM and Supabase for authentication

### Technologies

-   **Backend**: Python, Flask
-   **Frontend**: TypeScript, Next.js, React, Tailwind CSS
-   **Database**: PostgreSQL, Prisma, Supabase

## Project Structure

The project is organized into the following main directories:

-   **`backend/`**: Contains the Flask REST API. See the `backend/README.md` for more details.
-   **`frontend/`**: Contains the Next.js application. See the `frontend/AGENTS.md` and `frontend/README.md` for more details.
-   **`notebooks/`**: Contains Jupyter notebooks for data analysis and model experimentation.


## Build and Run Commands

### Backend (Flask)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Create a virtual environment:**
    -   **Windows:**
        ```bash
        python -m venv venv
        venv\Scripts/activate
        ```
    -   **macOS/Linux:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Start the development server:**
    ```bash
    python app.py
    ```
    The backend will be available at `http://localhost:8000`.

### Frontend (Next.js)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    bun install
    ```
3.  **Set up environment variables:**
    Create a `.env.local` file in the `frontend` directory with the following content:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public
    ```
4.  **Generate Prisma client and apply schema:**
    ```bash
    npx prisma generate
    npx prisma db push
    ```
5.  **Start the development server:**
    ```bash
    bun dev
    ```
    The frontend will be available at `http://localhost:3000`.


### Key Backend Files

-   `app.py`: The main Flask application file.
-   `requirements.txt`: The Python dependencies for the backend.
-   `run_flask.bat`: A batch file for running the Flask application on Windows.
-   `test_flask.py`: The tests for the Flask application.

For more detailed information about the backend, see the `backend/README.md` file.

### Key Frontend Files

-   `app/`: The Next.js App Router pages and layouts.
-   `actions/`: Server actions for authentication, case management, and disease detection.
-   `prisma/`: The database schema and Prisma client.
-   `utils/`: Utility functions, including Supabase clients.
-   `public/`: Static assets.

For more detailed information about the frontend, see the `frontend/README.md` file.

### Seeding the database

To seed the database with initial data, run the following command in the `frontend` directory:

```bash
node scripts/seed-diagnoses.js
```

## Development Conventions

### Backend

-   The backend is a standard Flask application.
-   Follow the conventions in the existing code.
-   Write tests for new features in the `backend/tests` directory.

### Frontend

-   The frontend is a Next.js application with the App Router.
-   Use TypeScript for all new code.
-   Use Prisma for all database interactions.
-   Use Supabase for authentication.
-   Follow the conventions in the existing code.
-   Write tests for new features.

### Commits

-   Follow the conventional commit format.


## Miscellaneous

-   The `notebooks/` directory contains Jupyter notebooks for data analysis and model experimentation.
-   The project was bootstrapped with `create-next-app`.
-   The backend was migrated from Django to Flask. See `backend/MIGRATION_GUIDE.md` for more details.

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