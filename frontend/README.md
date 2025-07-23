# Aill-Be-Sick Frontend

This is the frontend application for the Aill-Be-Sick disease detection system, built with [Next.js](https://nextjs.org) and bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

- **Disease Detection**: Enter symptoms and get AI-powered disease predictions
- **User Authentication**: Secure login/signup with Supabase Auth
- **Case Management**: Track and store disease detection cases
- **Real-time Analysis**: Integration with Django backend for symptom analysis

## Tech Stack

- **Framework**: Next.js 15.4.2 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **TypeScript**: Full type safety

## Prerequisites

Before running this application, make sure you have:

- Node.js 18+ installed
- A PostgreSQL database set up
- Supabase project configured
- Backend Django server running on `http://localhost:8000`

## Environment Variables

Create a `.env.local` file in the frontend directory with:

```env
DATABASE_URL="your_postgresql_connection_string"
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
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

- `/app` - Next.js App Router pages and layouts
- `/actions` - Server actions for authentication, case management, and disease detection
- `/prisma` - Database schema and Prisma client
- `/utils` - Utility functions including Supabase clients
- `/public` - Static assets

## Key Pages

- `/` - Home page displaying all cases
- `/new` - Symptom input page for disease detection
- `/login` - User authentication page

## API Integration

The frontend communicates with the Django backend for disease detection:

- **Endpoint**: `POST http://localhost:8000/classifications/new`
- **Payload**: `{ "symptoms": ["symptom1", "symptom2", ...] }`
- **Response**: Detected disease prediction

## Database Schema

The application uses Prisma with the following models:

- **User**: Manages user accounts with email and name
- **Case**: Stores disease detection cases with symptoms, detected disease, and timestamps

## Development

To start developing:

1. Make sure the Django backend is running
2. Ensure your database is set up and migrated
3. Run the development server with `npm run dev`
4. The app will be available at `http://localhost:3000`

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
3. **Backend connection errors**: Make sure the Django server is running on port 8000
4. **Prisma client errors**: Run `npx prisma generate` to regenerate the client

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
