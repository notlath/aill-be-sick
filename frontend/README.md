# Aill-Be-Sick Frontend

This is the frontend application for the Aill-Be-Sick disease detection system, built with [Next.js](https://nextjs.org) and bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

- **Disease Detection**: Enter symptoms and get AI-powered disease predictions with confidence/uncertainty scoring
- **User Authentication**: Secure login/signup with Supabase Auth
- **Role-Based Access**: Support for PATIENT, CLINICIAN, and DEVELOPER roles
- **Case Management**: Track and store disease detection cases with detailed metrics
- **Clinician Dashboard**: Patient clustering, outbreak surveillance, alerts, healthcare reports
- **Interactive Maps**: Geospatial visualization with Leaflet
- **Model Explainability**: SHAP-based explanations for diagnosis decisions
- **Multi-language Support**: English and Tagalog symptom input

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Database**: PostgreSQL with Prisma ORM (v6.19.2)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS with DaisyUI components
- **State Management**: Zustand + React Server Actions
- **HTTP Client**: Axios
- **Charts**: Recharts, D3.js
- **Maps**: Leaflet, React-Leaflet
- **Forms**: React Hook Form with Zod validation
- **TypeScript**: Full type safety

## Prerequisites

Before running this application, make sure you have:

- Node.js 18+ installed
- A PostgreSQL database set up
- Supabase project configured
- Backend Flask server running on `http://localhost:10000`

## Environment Variables

Create a `.env.local` file in the frontend directory with:

```env
DATABASE_URL="your_postgresql_connection_string"
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
NEXT_PUBLIC_BACKEND_URL="http://localhost:10000"
```

## Getting Started

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Set up the database:

```bash
npx prisma generate
npx prisma db push
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
frontend/
├── actions/                 # Server actions (25+ actions)
│   ├── client.ts            # Action client setup
│   ├── create-chat.ts       # Chat creation
│   ├── create-diagnosis.ts  # Diagnosis creation
│   ├── run-diagnosis.ts     # Main diagnosis integration
│   ├── explain-diagnosis.ts # SHAP explanations
│   ├── email-auth.ts        # Email authentication
│   └── ...                  # Additional actions
├── app/                     # Next.js App Router
│   ├── (app)/               # Protected routes
│   │   ├── (clinician)/     # Clinician pages (dashboard, alerts, map, etc.)
│   │   └── (patient)/       # Patient pages (diagnosis, history, profile)
│   ├── (auth)/              # Authentication pages
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── clinicians/          # Clinician-specific components
│   │   ├── alerts/          # Alert management
│   │   ├── clustering/      # Patient clustering views
│   │   ├── dashboard-page/  # Dashboard components
│   │   ├── map-page/        # Map visualization
│   │   └── ...
│   ├── patient/             # Patient-specific components
│   │   ├── diagnosis-page/  # Diagnosis interface
│   │   ├── history-page/    # History views
│   │   └── ...
│   ├── shared/              # Shared components
│   └── ui/                  # Base UI components (shadcn/ui)
├── hooks/                   # Custom React hooks
│   ├── illness-cluster-hooks/
│   ├── map-hooks/
│   └── ...
├── stores/                  # Zustand state stores
│   ├── use-alerts-store.ts
│   ├── use-map-store.ts
│   └── ...
├── schemas/                 # Zod validation schemas
├── utils/                   # Utility functions
│   ├── supabase/            # Supabase clients
│   └── ...
├── types/                   # TypeScript type definitions
├── prisma/                  # Prisma schema & migrations
└── package.json
```

## Key Pages

### Patient Routes
- `/` - Home page (redirects based on role)
- `/diagnosis` - Symptom input and AI-powered disease detection
- `/history` - View past diagnoses and cases
- `/profile` - User profile management

### Clinician Routes
- `/dashboard` - Main clinician dashboard with clustering and surveillance
- `/alerts` - Alert management and notifications
- `/map` - Geospatial visualization of cases
- `/healthcare-reports` - Generate and view reports
- `/users` - User management
- `/clinician-profile` - Clinician profile settings

### Authentication
- `/login` - Patient login
- `/clinician-login` - Clinician login
- `/signup` - New user registration

## API Integration

The frontend communicates with the Flask backend for disease detection:

- **Base URL**: `http://localhost:10000` (configurable via `NEXT_PUBLIC_BACKEND_URL`)
- **Diagnosis Endpoint**: `POST /diagnosis/new`
  - **Payload**: `{ "symptoms": "symptom text", "language": "en" | "tl" }`
  - **Response**: Disease prediction, confidence, uncertainty, probability distributions
- **Follow-up Endpoint**: `POST /diagnosis/follow-up`
- **Explanation Endpoint**: `POST /diagnosis/explain`
- **Clustering Endpoint**: `GET /api/patient-clusters`
- **Surveillance Endpoint**: `GET /api/surveillance/outbreaks`

The system evaluates confidence and uncertainty scores to determine result reliability.

## Database Schema

The application uses Prisma with PostgreSQL. Key models include:

- **User**: User accounts with email, name, role (PATIENT/CLINICIAN/DEVELOPER), and location data
- **Chat**: Conversational sessions between users and AI
- **Message**: Individual chat messages with types (SYMPTOMS, ANSWER, QUESTION, DIAGNOSIS, etc.)
- **TempDiagnosis**: Temporary diagnosis suggestions during conversations
- **Diagnosis**: Confirmed diagnoses with confidence, uncertainty, disease, and model metadata
- **Explanation**: SHAP-based token importance scores for model explainability
- **Alert**: Clinician alerts for outbreak surveillance

Supported diseases: DENGUE, PNEUMONIA, TYPHOID, IMPETIGO

## Development

To start developing:

1. Make sure the Flask backend is running on port 10000
2. Ensure your database is set up and migrated
3. Run the development server with `npm run dev`
4. The app will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run Next.js linting
- `npm run seed:diagnoses` - Seed diagnosis data
- `npm run seed:users` - Seed user data
- `npm run seed:realistic` - Seed realistic test data

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Prisma Documentation](https://prisma.io/docs) - database ORM and schema management
- [Supabase Documentation](https://supabase.com/docs) - authentication and real-time features
- [Tailwind CSS](https://tailwindcss.com/docs) - utility-first CSS framework

## Troubleshooting

**Common Issues:**

1. **Database connection errors**: Ensure your `DATABASE_URL` is correct and the database is accessible
2. **Supabase authentication issues**: Verify your Supabase environment variables
3. **Backend connection errors**: Make sure the Flask server is running on port 10000
4. **Prisma client errors**: Run `npx prisma generate` to regenerate the client
5. **Map not loading**: Check that Leaflet CSS is properly imported

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational/thesis purposes.
