# Gemini Code Time

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
        venv\Scripts\activate
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

