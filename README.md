# AILL-BE-SICK - A Predictive Intelligent Health Screening and Analysis System

A full-stack application for disease detection based on symptoms, built with Flask backend and Next.js frontend.

## Project Structure

```
aill-be-sick-test/
├── backend/          # Flask REST API
├── frontend/         # Next.js React application
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

- `GET /classifications/` - Health check / greeting
- `POST /classifications/new` - Disease detection endpoint

## Frontend Setup (Next.js)

The `frontend` directory contains everything related to the web interface of the application. Its main job is to display pages, provide interactive features, and communicate with backend services or databases.

### Key Technologies

- **Next.js:** A popular framework for building modern web apps. It helps with routing, server-side rendering, and more.
- **Prisma:** Toolkit for working with databases in JavaScript/TypeScript projects.
- **TypeScript:** JavaScript with types for safer development.

### Folder Structure

Here’s a breakdown of what you’ll typically find inside:

#### `/app`
This is where most of the web pages live. With Next.js, each folder or file under `app` usually becomes a route (a web page or API endpoint). For example:
- `/app/page.tsx` might be your home page.
- `/app/about/page.tsx` might be the "About" page.

You’ll also find special files here for layouts, loading indicators, and error handling.

#### `/actions`
This folder holds server actions that handle submitting forms, fetching data, and other app logic.

#### `/prisma`
Database-related files:
- `schema.prisma`: Defines the data model.
- Migration files as the project evolves.

#### `/utils`
Helper functions and reusable code (e.g., formatting, data transforms).

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

Using npm:

```bash
npm install
```

Using yarn:

```bash
yarn install
```

Using bun (recommended):

```bash
bun install
```

### 3. Environment Configuration

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL="your_database_url"
```

### 4. Database Setup (Prisma)

Generate Prisma client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma db push
```

### 5. Start Development Server

Using npm:

```bash
npm run dev
```

Using yarn:

```bash
yarn dev
```

Using bun:

```bash
bun dev
```

The Next.js frontend will be available at `http://localhost:3000`.

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

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000

## Usage

1. Navigate to the homepage at `http://localhost:3000`
2. Click on the `/new` page link or go to `http://localhost:3000/new`
3. Enter your symptoms (comma-separated)
4. Submit the form to get disease detection results
5. Check the console logs for fetched data regarding diseases

## Development Features

### Backend (Flask)

- REST API for disease detection
- CORS enabled for frontend integration
- JSON request/response handling
- Simple, lightweight setup with fast startup

### Frontend (Next.js)

- TypeScript support
- Tailwind CSS for styling
- Prisma ORM for database operations
- Supabase integration
- Server actions for API calls
- Responsive design

## Project Architecture

- **Backend:** Flask REST API that processes symptoms and returns disease predictions
- **Frontend:** Next.js application with server-side rendering and client-side interactions
- **Database:**
  - PostgreSQL for Next.js frontend (via Prisma/Supabase)

## Troubleshooting

### Common Issues

1. **Port conflicts:** Ensure ports 3000 and 8000 are available
2. **CORS issues:** Ensure Flask-CORS is installed and configured
3. **Database connections:** Verify your DATABASE_URL in the frontend `.env.local`
4. **Python path:** Make sure your virtual environment is activated for the backend

### Backend Checks

- Verify Flask is installed and venv is active
- Ensure the server is listening on the expected port (`app.run(..., port=8000)`)

### Frontend Checks

- Clear node modules and reinstall: `rm -rf node_modules && npm install`
- Check Prisma client generation: `npx prisma generate`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both backend and frontend
5. Submit a pull request

## License

This project is for educational/thesis purposes.
