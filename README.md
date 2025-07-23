# AILL-BE-SICK - A Predictive Intelligent Health Screening and Analysis System

A full-stack application for disease detection based on symptoms, built with Django backend and Next.js frontend.

## Project Structure

```
aill-be-sick-test/
├── backend/          # Django REST API
├── frontend/         # Next.js React application
└── README.md
```

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Python 3.8+** (for Django backend)
- **Node.js 18+** (for Next.js frontend)
- **npm** or **yarn** or **bun** (package manager)
- **Git** (for version control)

## Backend Setup (Django)

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
pip install django
pip install djangorestframework
```

### 4. Start Development Server

```bash
python manage.py runserver
```

The Django backend will be available at `http://localhost:8000`

### API Endpoints

- `GET /classifications/` - Test endpoint
- `POST /classifications/new` - Disease detection endpoint
- `GET /admin/` - Django admin panel

## Frontend Setup (Next.js)

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

Using bun:

```bash
bun install
```

### 3. Environment Configuration

Create a `.env.local` file in the frontend directory:

```env
DATABASE_URL="your_postgresql_connection_string"
```

**Note:** The project uses Supabase/PostgreSQL for the frontend database. Configure your database connection string accordingly.

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

The Next.js frontend will be available at `http://localhost:3000`

## Running the Full Application

### 1. Start Backend Server

In the `backend` directory:

```bash
python manage.py runserver
```

### 2. Start Frontend Server

In the `frontend` directory:

```bash
npm run dev
```

### 3. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Django Admin:** http://localhost:8000/admin

## Usage

1. Navigate to the homepage at `http://localhost:3000`
2. Click on the `/new` page link or go to `http://localhost:3000/new`
3. Enter your symptoms (comma-separated)
4. Submit the form to get disease detection results
5. Check the console logs for fetched data regarding diseases

## Development Features

### Backend (Django)

- REST API for disease detection
- SQLite database for development
- Django admin interface
- CSRF exemption for API endpoints
- JSON request/response handling

### Frontend (Next.js)

- TypeScript support
- Tailwind CSS for styling
- Prisma ORM for database operations
- Supabase integration
- Server actions for API calls
- Responsive design

## Project Architecture

- **Backend:** Django REST API that processes symptoms and returns disease predictions
- **Frontend:** Next.js application with server-side rendering and client-side interactions
- **Database:**
  - SQLite for Django backend (development)
  - PostgreSQL for Next.js frontend (via Prisma/Supabase)

## Troubleshooting

### Common Issues

1. **Port conflicts:** Ensure ports 3000 and 8000 are available
2. **CORS issues:** The backend is configured to accept requests from the frontend
3. **Database connections:** Verify your DATABASE_URL in the frontend `.env.local`
4. **Python path:** Make sure your virtual environment is activated for the backend

### Backend Issues

- Check if Django is properly installed: `python -m django --version`
- Verify database migrations: `python manage.py showmigrations`

### Frontend Issues

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
