# Developer Role Feature

## Overview

The DEVELOPER role allows you to switch between Patient and Clinician views with a single click, making it easier to test and develop features for both user types without needing to log in and out or maintain multiple accounts.

## Features

- **View Switcher Button**: Located in the user dropdown menu (click on your avatar in the sidebar header)
- **Persistent View Selection**: Your selected view is saved in localStorage and persists across sessions
- **Full Access**: Developers can access all pages and features available to both Patients and Clinicians
- **Easy Navigation**: Navigation items automatically update based on the selected view

## Setup

### 1. Generate Prisma Client with New Role

First, stop the development server if it's running, then generate the Prisma client:

```bash
cd frontend
npx prisma generate
```

### 2. Run Database Migration

Apply the database migration to add the DEVELOPER role:

```bash
cd frontend
npx prisma migrate dev --name add_developer_role
```

### 3. Set a User to DEVELOPER Role

You can set an existing user's role to DEVELOPER using the provided script:

```bash
cd frontend
npx tsx scripts/set-developer-role.ts your-email@example.com
```

Or manually update the database:

```sql
-- Using your database client
UPDATE "User" SET role = 'DEVELOPER' WHERE email = 'your-email@example.com';
```

## Usage

1. **Login** with your developer account
2. **Click on your avatar** in the sidebar header to open the dropdown menu
3. **Click "Switch to Clinician View"** or **"Switch to Patient View"** to toggle between views
4. The app will redirect you to the appropriate home page and update the navigation

## How It Works

- The view preference is stored in `localStorage` under the key `developerView`
- When you switch views, the navigation items, layouts, and routing all adapt automatically
- Your actual role in the database remains DEVELOPER - the view switching is purely client-side
- Both patient and clinician layouts allow DEVELOPER role access

## Files Modified

- `frontend/prisma/schema.prisma` - Added DEVELOPER to Role enum
- `frontend/components/patient/layout/header.tsx` - Added ViewSwitcherBtn
- `frontend/components/patient/layout/view-switcher-btn.tsx` - New component for view switching
- `frontend/components/patient/layout/nav-links.tsx` - Dynamic navigation based on view
- `frontend/app/(app)/(patient)/layout.tsx` - Allow DEVELOPER access
- `frontend/app/(app)/(clinician)/layout.tsx` - Allow DEVELOPER access with sidebar
- `frontend/app/page.tsx` - Route DEVELOPER to patient view by default
- `frontend/hooks/use-developer-view.tsx` - Context for managing developer view (optional)
- `frontend/scripts/set-developer-role.ts` - Helper script to set user role

## Troubleshooting

### Type Errors

If you see TypeScript errors about the DEVELOPER role not existing, make sure to:

1. Stop the dev server
2. Run `npx prisma generate` in the frontend directory
3. Restart the dev server

### Permission Errors During Prisma Generate

If you get permission errors when running `npx prisma generate`, stop all running dev servers and try again.

### View Not Persisting

If your view selection doesn't persist across page reloads, check your browser's localStorage to ensure `developerView` is being set correctly.
