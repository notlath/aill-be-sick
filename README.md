# AILL-BE-SICK - A Predictive Intelligent Health Screening and Analysis System

A full-stack application for disease detection based on symptoms, built with a Flask backend and a Next.js (App Router) frontend using TypeScript, Prisma, and Supabase.

## Project Structure

```text
aill-be-sick/
├── backend/          # Flask REST API
├── frontend/         # Next.js app (TypeScript, Prisma, Supabase)
└── README.md
```

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Python 3.8+** (for Flask backend)
- **Node.js 18+** (for Next.js frontend)
- **npm** or **yarn** or **bun** (package manager)
- **Git** (for version control)

## Backend Setup (Flask)

For detailed backend docs, see backend/README.md.

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create Virtual Environment

**Windows:**

```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Start Development Server

Option 1: Direct Python execution

```bash
python app.py
```

Option 2: Windows batch file

```bash
run_flask.bat
```

Option 3: Gunicorn (production-like)

```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

The Flask backend will be available at `http://localhost:8000`.

### API Endpoints

- `GET /diagnosis/` - Health check / greeting
- `POST /diagnosis/new` - Disease diagnosis endpoint

## Frontend Setup (Next.js App Router)

The `frontend` directory contains the Next.js application. It uses the App Router, Prisma (with PostgreSQL), and Supabase for authentication.

### Key Technologies

- Next.js (App Router, TypeScript)
- Prisma ORM with PostgreSQL
- Supabase auth and helpers
- Tailwind CSS

### Updated Folder Highlights

Below are the important paths you’ll use most often:

```text
frontend/
├── app/                         # App Router pages and layouts
│   ├── page.tsx                 # Home page
│   ├── (app)/                   # Main application flow
│   │   ├── (patient)/
│   │   │   ├── diagnosis/       # Patient diagnosis
│   │   │   └── history/         # Patient history
│   │   └── (clinician)/
│   │       └── dashboard/       # Clinician dashboard
│   ├── (auth)/                  # Auth flow
│   │   ├── login/               # Patient login page
│   │   └── clinician-login/     # Clinician login page
│   └── auth/callback/route.ts   # Supabase auth callback route
├── actions/                     # Server actions (create chat, message, diagnosis)
├── components/                  # UI components
├── utils/                       # Helpers (auth, chat, user, message)
│   └── supabase/                # Supabase client/middleware/server helpers
├── prisma/
│   ├── schema.prisma            # Prisma schema
│   └── migrations/              # Prisma migrations
├── middleware.ts                # Next.js middleware (auth/session)
├── next.config.ts               # Next.js config
├── package.json                 # Scripts and deps
└── tsconfig.json                # TypeScript config
```

Note: A generated Prisma client may exist under `app/generated/prisma` or `frontend/generated/prisma` during builds; this is not typically edited by hand.

### 1) Navigate to Frontend

```powershell
cd frontend
```

### 2) Install Dependencies

Choose one package manager (bun or npm recommended):

```powershell
# bun (fast)
bun install

# or npm
npm install
```

### 3) Environment Variables

Create a `.env.local` in `frontend` (if one isn’t already present). These are the common variables used by the app:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public
```

- Keep secrets out of version control; prefer `.env.local` for local dev.
- If a `.env` already exists in the repo, `.env.local` will override for your machine.

### 4) Database and Prisma

Generate the Prisma client and apply your schema to the database:

```powershell
npx prisma generate
npx prisma db push
```

If you prefer migrations for iterative changes:

```powershell
npx prisma migrate dev --name init
```

### 5) Start the Next.js Dev Server

```powershell
# bun
bun dev

# or npm
npm run dev
```

The frontend runs at [http://localhost:3000](http://localhost:3000).

## Running the Full Application

### 1. Start Backend Server

In the `backend` directory:

```bash
python app.py
```

(or use `run_flask.bat` on Windows)

### 2. Start Frontend Server

In the `frontend` directory:

```bash
npm run dev
```

### 3. Access the Application

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)

## Usage

1. Open [http://localhost:3000](http://localhost:3000)
2. Sign in (Patient: `/login`, Clinician: `/clinician-login`)
3. For patients, start a diagnosis from the Diagnosis page in the UI
4. Chat and submit symptoms to receive disease screening results
5. View history (patients) or dashboard (clinicians) after login

## Development Features

### Backend (Flask)

- REST API for disease detection
- CORS enabled for frontend integration
- JSON request/response handling
- Simple, lightweight setup with fast startup

### Frontend (Next.js)

- App Router with server components
- TypeScript and Tailwind CSS
- Prisma ORM (PostgreSQL) for data access
- Supabase authentication and middleware
- Server Actions for chat/message/diagnosis flows
- Responsive UI components

## Project Architecture

- Backend: Flask REST API that processes symptoms and returns disease predictions
- Frontend: Next.js App Router app with server-side rendering and interactive chat
- Database: PostgreSQL (Prisma) with Supabase auth integration

## Troubleshooting

### Common Issues

1. Port conflicts: Ensure 3000 (frontend) and 8000 (backend) are free
2. CORS issues: Ensure Flask-CORS is installed and configured on the backend
3. Database connection: Verify `DATABASE_URL` in `frontend/.env.local`
4. Prisma client: Re-run `npx prisma generate` after schema changes
5. Windows line endings: If shell scripts misbehave, prefer PowerShell commands

### Backend Checks

- Verify Flask is installed and the venv is active
- Confirm the server runs on the expected port (`app.run(..., port=8000)`)

### Frontend Checks (Windows-friendly)

- Clean install if issues persist:

  ```powershell
  rd /s /q node_modules
  npm install
  ```

- Regenerate Prisma client and push schema:

  ```powershell
  npx prisma generate
  npx prisma db push
  ```

- Ensure `.env.local` exists and values are correct

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both backend and frontend
5. Submit a pull request

## License

This project is for educational/thesis purposes.
