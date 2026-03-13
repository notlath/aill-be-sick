# Admin Authentication & Clinician Email Whitelist System

## Overview

### Purpose

This feature introduces a comprehensive multi-role authentication system with three distinct user portals: **Admin**, **Clinician**, and **Patient**. It implements a secure email whitelist mechanism that controls clinician registration, ensuring only pre-approved medical professionals can access the clinician portal.

### Target Users

- **Administrators**: Healthcare organization managers who oversee the entire system, manage clinician access, and monitor disease surveillance data
- **Clinicians**: Medical professionals who diagnose patients and review health patterns
- **Patients**: End users who receive disease detection services
- **Developers**: Technical team members with elevated access for debugging and development

### Key Benefits

1. **Role-Based Access Control**: Segregated portals with tailored navigation and functionality for each user type
2. **Controlled Clinician Onboarding**: Email whitelist prevents unauthorized clinician registration
3. **Unified Authentication**: Single Supabase authentication backend with Prisma ORM role management
4. **Admin Self-Service**: Admins can independently manage clinician email whitelists without database access
5. **Scalable Architecture**: Extensible role system supporting future role additions

---

## System Architecture

### Authentication Flow

```mermaid
graph TD
    A[User Visits Login Page] --> B{Select Portal Type}
    B -->|Patient| C[Patient Login]
    B -->|Clinician| D[Clinician Login]
    B -->|Admin| E[Admin Login]
    
    C --> F[Supabase Auth]
    D --> G{Email in Whitelist?}
    G -->|Yes| F
    G -->|No| H[Registration Blocked]
    E --> F
    
    F --> I[Create/Update User in Prisma]
    I --> J{User Role}
    J -->|PATIENT| K[Redirect to Patient Dashboard]
    J -->|CLINICIAN| L[Redirect to Clinician Dashboard]
    J -->|ADMIN| M[Redirect to Admin Dashboard]
    J -->|DEVELOPER| N[Redirect to Developer View]
```

### Database Schema

#### New Models

**AllowedClinicianEmail**
```prisma
model AllowedClinicianEmail {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  createdAt DateTime @default(now())
}
```

**Role Enum (Extended)**
```prisma
enum Role {
  PATIENT
  CLINICIAN
  ADMIN        // New role
  DEVELOPER
}
```

**User Model (Existing)**
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  authId       String   @unique  // Supabase auth ID
  role         Role     @default(PATIENT)
  isOnboarded  Boolean  @default(false)
  // ... other fields
}
```

---

## Feature Components

### 1. Admin Authentication (`/frontend/actions/admin-auth.ts`)

#### Purpose
Provides dedicated login and signup actions for admin users, bypassing the clinician email whitelist restriction.

#### Implementation Details

**`adminLogin` Action**
- **Input**: `EmailAuthSchema` (email, password)
- **Process**: 
  1. Authenticates with Supabase
  2. Validates credentials
  3. Revalidates layout cache
  4. Redirects to home page
- **Error Handling**: Returns structured error messages from Supabase

**`adminSignup` Action**
- **Input**: `EmailAuthSchema` (email, password)
- **Process**:
  1. Constructs email redirect URL using environment variables
  2. Creates Supabase user with email confirmation
  3. Upserts user into Prisma database with `ADMIN` role
  4. Returns success confirmation
- **Security**: Automatically assigns ADMIN role (no whitelist required)

```typescript
export const adminSignup = actionClient
  .inputSchema(EmailAuthSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;
    const supabase = await createClient();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      "http://localhost:3000";

    const { error, data } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      }
    });

    if (data.user) {
      await prisma.user.upsert({
        where: { email: data.user.email },
        create: {
          email: data.user.email!,
          name: data.user.user_metadata?.name || "",
          authId: data.user.id,
          role: "ADMIN",
        },
        update: {},
      });
    }

    return { success: true };
  });
```

---

### 2. Email Whitelist Management (`/frontend/actions/manage-clinicians.ts`)

#### Purpose
Enables admins to control which email addresses can register as clinicians by managing a whitelist database table.

#### Actions

**`addAllowedClinicianEmail` Action**
- **Input**: `ManageClinicianEmailSchema` (email)
- **Authorization**: Requires ADMIN or DEVELOPER role
- **Validation**: 
  - Checks for duplicate emails
  - Validates email format via Zod schema
- **Process**:
  1. Verifies current user has admin/developer role
  2. Checks if email already exists in whitelist
  3. Creates new whitelist entry
  4. Revalidates `/dashboard` path
  5. Returns success with created record

**`removeAllowedClinicianEmail` Action**
- **Input**: `ManageClinicianEmailSchema` (email)
- **Authorization**: Requires ADMIN or DEVELOPER role
- **Process**:
  1. Verifies current user has admin/developer role
  2. Deletes whitelist entry
  3. Revalidates `/dashboard` path
  4. Returns success confirmation

```typescript
export const addAllowedClinicianEmail = actionClient
  .inputSchema(ManageClinicianEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const { success: dbUser, error, code } = await getCurrentDbUser();

    if (error || !dbUser) {
      return { error: "Unauthorized" };
    }

    if (dbUser.role !== "ADMIN" && dbUser.role !== ("DEVELOPER" as any)) {
      return { error: "Unauthorized. Admin access required." };
    }

    const existingEmail = await prisma.allowedClinicianEmail.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return { error: "This email is already on the whitelist." };
    }

    const allowedEmail = await prisma.allowedClinicianEmail.create({
      data: { email },
    });

    revalidatePath("/dashboard");

    return { success: allowedEmail };
  });
```

---

### 3. Enhanced Clinician Registration (`/frontend/actions/email-auth.ts`)

#### Purpose
Modifies existing clinician signup to enforce email whitelist validation before allowing registration.

#### Changes

**New Validation Logic**
```typescript
const allowedEmail = await prisma.allowedClinicianEmail.findUnique({
  where: { email },
});

if (!allowedEmail) {
  return {
    error: "Your email is not authorized to register as a clinician. Please contact your administrator.",
  };
}
```

**Post-Registration Cleanup**
```typescript
await prisma.allowedClinicianEmail.delete({
  where: { email },
});
```

**Behavior**:
1. Checks if email exists in whitelist
2. Blocks registration if not whitelisted
3. After successful registration, removes email from whitelist (one-time use)
4. Creates clinician user with CLINICIAN role

---

### 4. Admin Portal UI (`/frontend/app/(auth)/admin-login/page.tsx`)

#### Purpose
Provides a dedicated login interface for administrators with both sign-in and sign-up capabilities.

#### Features

- **Dual-Mode Form**: Login and signup in single interface
- **Responsive Design**: Split-screen layout with image panel on large screens
- **Form Validation**: Real-time Zod validation with error messages
- **Loading States**: Spinner indicators during auth operations
- **Toast Notifications**: Success/error feedback via Sonner
- **Portal Navigation**: Links to patient and clinician login pages

#### Layout Structure

```tsx
<main className="flex min-h-screen bg-base-200">
  {/* Left Column - Auth Form */}
  <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32">
    {/* Form content */}
  </section>

  {/* Right Column - Image */}
  <section className="hidden lg:block lg:flex-1 relative p-2">
    <img src="..." className="w-full h-full object-cover rounded-3xl" />
  </section>
</main>
```

---

### 5. Users Management Page (`/frontend/app/(app)/(clinician)/users/page.tsx`)

#### Purpose
Centralized interface for viewing all users and managing clinician email whitelists (admin-only).

#### Features

**Role-Based Filtering**
- **Admin View**: Can filter by ADMIN, CLINICIAN, PATIENT roles
- **Clinician View**: Limited to PATIENT role filter only

**Admin Actions**
- Add clinician email to whitelist (modal interface)
- View all users across roles
- Monitor clinician patient counts

**Data Table Integration**
- Sorting by name, email, role, patient count
- Search functionality
- Pagination (10 users per page)
- Skeleton loading states

```typescript
const UsersPage = async () => {
  const { success: dbUser } = await getCurrentDbUser();
  const currentUserRole = dbUser?.role || "";

  return (
    <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br">
      {/* Hero Header Section */}
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTable currentUserRole={currentUserRole} />
      </Suspense>
    </main>
  );
};
```

---

### 6. Add Clinician Email Modal (`/frontend/components/clinicians/users-page/add-clinician-email-modal.tsx`)

#### Purpose
Modal dialog for admins to add new email addresses to the clinician whitelist.

#### Features

- **Dialog Component**: Native HTML `<dialog>` with backdrop
- **Form Validation**: Email format validation via Zod
- **Loading States**: Disabled submit during API call
- **Success Feedback**: Toast notification on success
- **Auto-Close**: Closes on successful submission
- **Click-Outside Dismissal**: Backdrop click closes modal

#### Usage Pattern

```tsx
<AddClinicianEmailModal
  isOpen={isAddEmailModalOpen}
  onClose={() => setIsAddEmailModalOpen(false)}
/>
```

---

### 7. Enhanced Navigation System (`/frontend/constants/nav-items.ts`, `/frontend/components/patient/layout/nav-links.tsx`)

#### Purpose
Dynamic navigation that adapts to user role, providing appropriate menu items for each portal type.

#### Admin Navigation Items

```typescript
export const adminNavItems: NavItem[] = [
  {
    name: "Surveillance",
    href: "/map",
    icon: MapPin,
  },
  {
    name: "Patterns",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Alerts",
    href: "/alerts",
    icon: OctagonAlert,
  },
  {
    name: "Reports",
    href: "/healthcare-reports",
    icon: FileText,
  },
  {
    name: "Users",
    href: "/users",
    icon: User,
  },
];
```

#### Navigation Logic

```typescript
const navItems = useMemo(() => {
  if (dbUser.role === "ADMIN") {
    return adminNavItems;
  }
  if (dbUser.role === ("DEVELOPER" as any)) {
    return currentView === "PATIENT" ? patientNavItems : clinicianNavItems;
  }
  return dbUser.role === "CLINICIAN" ? clinicianNavItems : patientNavItems;
}, [dbUser.role, currentView, pathname]);
```

---

### 8. Layout Routing & Protection

#### Clinician Layout (`/frontend/app/(app)/(clinician)/layout.tsx`)

**Updated Role Validation**
```typescript
if (dbUser.role !== "CLINICIAN" && 
    dbUser.role !== ("DEVELOPER" as any) && 
    dbUser.role !== "ADMIN") {
  redirect("/");
}
```

**Behavior**:
- Allows CLINICIAN, DEVELOPER, and ADMIN roles
- Redirects PATIENT users to home
- Prevents unauthorized access to clinician features

#### Home Page Redirects (`/frontend/app/page.tsx`)

**Role-Based Routing**
```typescript
if (dbUser.role === "ADMIN") {
  redirect("/dashboard");
}

if (dbUser.role === "PATIENT") {
  if (!dbUser.isOnboarded) {
    redirect("/onboarding");
  }
  redirect("/dashboard");
}
```

---

### 9. Enhanced Data Table (`/frontend/components/clinicians/users-page/data-table.tsx`)

#### Purpose
Centralized table component for displaying users with role-based filtering and admin controls.

#### New Features

**Admin-Only Controls**
- "Add Clinician Email" button (visible only to admins)
- Expanded role filter options (ADMIN, CLINICIAN, PATIENT)
- Non-admin users see only PATIENT filter

**Conditional Rendering**
```typescript
const roleFilterOptions = isAdmin
  ? [
      { value: "ADMIN", label: "Admin" },
      { value: "CLINICIAN", label: "Clinician" },
      { value: "PATIENT", label: "Patient" },
    ]
  : [{ value: "PATIENT", label: "Patient" }];
```

---

### 10. Header Component Updates (`/frontend/components/patient/layout/header.tsx`)

#### Purpose
Adapts header display based on user role, hiding profile links for admin users.

#### Changes

**Conditional Profile Link**
```typescript
{dbUser.role !== "ADMIN" && (
  <li>
    <button onClick={() => router.push(resolvedProfileLink)}>
      Profile
    </button>
  </li>
)}
```

**Dynamic Profile Resolution**
```typescript
const resolvedProfileLink = useMemo(() => {
  switch (dbUser.role) {
    case "CLINICIAN":
      return "/clinician-profile";
    default:
      return "/profile";
  }
}, [dbUser.role]);
```

**Null-Safe Name Display**
```typescript
{dbUser.name || "Clinician"}
{dbUser.name ? dbUser.name.charAt(0) : "C"}
```

---

### 11. Authentication Middleware (`/frontend/utils/supabase/proxy.ts`)

#### Purpose
Protects authentication routes from session update conflicts.

#### Updated Route Exclusions

```typescript
!request.nextUrl.pathname.startsWith('/clinician-reset-password') &&
!request.nextUrl.pathname.startsWith('/clinician-auth') &&
!request.nextUrl.pathname.startsWith('/admin-login')
```

**Behavior**: Prevents middleware from interfering with auth flow redirects.

---

### 12. User Utility Enhancements (`/frontend/utils/user.ts`)

#### Purpose
Extends user query utilities to support role-based filtering.

#### Updated `getAllUsers` Function

```typescript
export const getAllUsers = async (currentUserRole?: string) => {
  try {
    const whereClause = currentUserRole === "CLINICIAN" 
      ? { role: "PATIENT" as const } 
      : {};

    const users = await prisma.user.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        _count: {
          select: { diagnoses: true },
        },
      },
    });

    return { success: users };
  } catch (error) {
    console.error(`Error fetching all users: ${error}`);
    return { error: "Failed to fetch users." };
  }
};
```

**Behavior**:
- Clinicians see only PATIENT users
- Admins/Developers see all users
- Includes diagnosis count for each user

---

## User Flows

### Flow 1: Admin Onboarding

1. **Admin visits `/admin-login`**
2. **Selects "Sign Up"**
3. **Enters email and password**
4. **System validates input**
5. **Supabase creates auth user**
6. **Prisma upserts user with ADMIN role**
7. **Email confirmation sent**
8. **Admin confirms email**
9. **Redirected to dashboard**

---

### Flow 2: Clinician Registration (Whitelisted)

1. **Admin adds clinician email to whitelist** via Users page
2. **Clinician visits `/clinician-login`**
3. **Clinician clicks "Sign Up"**
4. **Enters whitelisted email and password**
5. **System checks whitelist** ✓
6. **Supabase creates auth user**
7. **Prisma creates user with CLINICIAN role**
8. **Email removed from whitelist** (one-time use)
9. **Clinician confirms email**
10. **Access granted to clinician portal**

---

### Flow 3: Clinician Registration (Not Whitelisted)

1. **Clinician visits `/clinician-login`**
2. **Enters non-whitelisted email**
3. **System checks whitelist** ✗
4. **Error displayed**: "Your email is not authorized to register as a clinician. Please contact your administrator."
5. **Registration blocked**

---

### Flow 4: Admin Managing Clinician Access

1. **Admin logs into `/admin-login`**
2. **Navigates to Users page (`/users`)**
3. **Clicks "Add Clinician Email" button**
4. **Modal opens**
5. **Enters clinician email**
6. **Submits form**
7. **System validates email format**
8. **Checks for duplicates**
9. **Adds to whitelist**
10. **Toast confirms success**
11. **Clinician can now register**

---

## Configuration & Setup

### Environment Variables

No new environment variables required. Uses existing:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public
NEXT_PUBLIC_APP_URL=your_app_url  # Optional, for email redirects
NEXT_PUBLIC_VERCEL_URL=your_vercel_url  # Optional, fallback for app URL
```

### Database Migration

**Required Steps**:

1. **Update Prisma Schema** (already done in staged changes)
   ```prisma
   model AllowedClinicianEmail {
     id        Int      @id @default(autoincrement())
     email     String   @unique
     createdAt DateTime @default(now())
   }

   enum Role {
     PATIENT
     CLINICIAN
     ADMIN
     DEVELOPER
   }
   ```

2. **Generate Prisma Client**
   ```bash
   cd frontend
   npx prisma generate
   ```

3. **Push Schema to Database**
   ```bash
   npx prisma db push
   ```

4. **Seed Initial Admin User** (Optional)
   ```javascript
   // scripts/seed-admin.js
   import prisma from '../prisma/prisma';

   async function seedAdmin() {
     await prisma.user.upsert({
       where: { email: 'admin@organization.com' },
       create: {
         email: 'admin@organization.com',
         name: 'System Administrator',
         authId: 'supabase-auth-id-from-manual-creation',
         role: 'ADMIN',
       },
       update: {},
     });
   }
   ```

---

## API Reference

### Server Actions

#### `adminLogin`
**Location**: `/frontend/actions/admin-auth.ts`

**Input Schema**:
```typescript
{
  email: string,    // Valid email format
  password: string  // Min 6 characters (Supabase default)
}
```

**Return Types**:
```typescript
// Success
{ success: true }

// Error
{ error: string }
```

**Usage**:
```tsx
const { execute } = useAction(adminLogin, {
  onSuccess: ({ data }) => {
    if (data?.error) toast.error(data.error);
  },
});
```

---

#### `adminSignup`
**Location**: `/frontend/actions/admin-auth.ts`

**Input Schema**: Same as `adminLogin`

**Side Effects**:
- Creates Supabase auth user
- Creates/updates Prisma user with ADMIN role
- Sends confirmation email

**Return Types**:
```typescript
// Success
{ success: true }

// Error
{ error: string }
```

---

#### `addAllowedClinicianEmail`
**Location**: `/frontend/actions/manage-clinicians.ts`

**Input Schema**:
```typescript
{
  email: string  // Valid email format
}
```

**Authorization**: ADMIN or DEVELOPER role required

**Return Types**:
```typescript
// Success
{ success: AllowedClinicianEmail }

// Error - Unauthorized
{ error: "Unauthorized" }

// Error - Duplicate
{ error: "This email is already on the whitelist." }

// Error - Server Error
{ error: "Failed to add email to whitelist." }
```

---

#### `removeAllowedClinicianEmail`
**Location**: `/frontend/actions/manage-clinicians.ts`

**Input Schema**: Same as `addAllowedClinicianEmail`

**Authorization**: ADMIN or DEVELOPER role required

**Return Types**:
```typescript
// Success
{ success: true }

// Error - Unauthorized
{ error: "Unauthorized" }

// Error - Server Error
{ error: "Failed to remove email from whitelist." }
```

---

#### `emailSignup` (Modified)
**Location**: `/frontend/actions/email-auth.ts`

**Changes**: Now checks whitelist before allowing clinician registration

**New Error Type**:
```typescript
{
  error: "Your email is not authorized to register as a clinician. Please contact your administrator."
}
```

---

### Utility Functions

#### `getAllUsers`
**Location**: `/frontend/utils/user.ts`

**Signature**:
```typescript
export const getAllUsers = async (currentUserRole?: string) => {
  // Returns: Promise<{ success: User[] } | { error: string }>
}
```

**Parameters**:
- `currentUserRole` (optional): Filters results based on caller's role
  - `"CLINICIAN"`: Returns only PATIENT users
  - `"ADMIN"` | `"DEVELOPER"`: Returns all users
  - `undefined`: Returns all users

**Return Structure**:
```typescript
{
  success: [
    {
      id: string,
      email: string,
      name: string | null,
      role: Role,
      isOnboarded: boolean,
      _count: {
        diagnoses: number
      }
    }
  ]
}
```

---

## Error Handling

### Common Errors & Solutions

#### 1. "Your email is not authorized to register as a clinician"

**Cause**: Clinician email not in whitelist

**Solution**:
1. Admin must add email via Users page
2. Verify email spelling matches exactly
3. Retry registration

---

#### 2. "This email is already on the whitelist"

**Cause**: Duplicate email submission

**Solution**:
- Email already exists; no action needed
- Clinician can proceed with registration
- If registration failed, admin can remove and re-add

---

#### 3. "Unauthorized. Admin access required"

**Cause**: Non-admin user attempting to manage whitelist

**Solution**:
- Ensure user has ADMIN or DEVELOPER role in database
- Check `user.role` field in Prisma
- Contact system administrator for role elevation

---

#### 4. "Failed to add email to whitelist"

**Cause**: Database connection error or constraint violation

**Solution**:
1. Check DATABASE_URL environment variable
2. Verify database connectivity
3. Check server logs for detailed error
4. Ensure email format is valid

---

#### 5. Supabase Auth Errors

**Common Messages**:
- `"Invalid login credentials"`: Wrong email/password
- `"User already registered"`: Email exists in Supabase
- `"Email not confirmed"`: User hasn't clicked confirmation link

**Solutions**:
- Verify credentials
- Use password reset flow
- Resend confirmation email via Supabase dashboard

---

## Security Considerations

### Access Control Matrix

| Action | Patient | Clinician | Admin | Developer |
|--------|---------|-----------|-------|-----------|
| View patient dashboard | ✓ | ✗ | ✗ | ✓ (toggle) |
| View clinician dashboard | ✗ | ✓ | ✓ | ✓ (toggle) |
| View admin dashboard | ✗ | ✗ | ✓ | ✗ |
| Register as clinician | N/A | Whitelist required | ✗ | ✗ |
| Register as admin | ✗ | ✗ | Open | ✗ |
| Add clinician email | ✗ | ✗ | ✓ | ✓ |
| Remove clinician email | ✗ | ✗ | ✓ | ✓ |
| View all users | ✗ | Patients only | ✓ | ✓ |
| Manage patients | ✗ | ✓ | ✓ | ✓ |

---

### Security Best Practices Implemented

1. **Server-Side Authorization**: All role checks performed server-side
2. **One-Time Whitelist Use**: Emails removed after successful registration
3. **Input Validation**: Zod schemas validate all inputs
4. **Safe Action Pattern**: next-safe-action enforces structured responses
5. **Revalidation Control**: Explicit path revalidation prevents stale data
6. **Role Enumeration**: TypeScript enums prevent invalid role values
7. **Middleware Protection**: Supabase middleware excludes auth routes

---

### Potential Security Enhancements

1. **Email Domain Restrictions**: Limit admin signup to organization domains
2. **Rate Limiting**: Prevent brute-force whitelist enumeration
3. **Audit Logging**: Track whitelist additions/removals
4. **Multi-Factor Authentication**: Require MFA for admin accounts
5. **Session Timeout**: Shorter sessions for privileged roles
6. **IP Whitelisting**: Restrict admin access to known IPs

---

## Testing Guidelines

### Manual Testing Checklist

#### Admin Authentication
- [ ] Admin signup creates user with ADMIN role
- [ ] Admin login redirects to dashboard
- [ ] Confirmation email sent on signup
- [ ] Email confirmation flow works
- [ ] Invalid credentials show error
- [ ] Duplicate email handling works

---

#### Clinician Whitelist
- [ ] Non-whitelisted email blocked at registration
- [ ] Whitelisted email allows registration
- [ ] Email removed from whitelist after signup
- [ ] Duplicate whitelist attempt shows error
- [ ] Admin can add email via modal
- [ ] Email validation works (rejects invalid formats)

---

#### Role-Based Access
- [ ] Patient cannot access `/users` page
- [ ] Clinician sees only patients in user list
- [ ] Admin sees all users and role filters
- [ ] Admin navigation shows correct items
- [ ] Layout redirects work for invalid roles
- [ ] Developer view toggle works

---

#### UI/UX
- [ ] Loading states display correctly
- [ ] Toast notifications appear on actions
- [ ] Modal opens/closes properly
- [ ] Form validation shows inline errors
- [ ] Responsive design works on mobile
- [ ] Skeleton loaders during data fetch

---

### Automated Testing Recommendations

#### Unit Tests

```typescript
// __tests__/manage-clinicians.test.ts
describe('addAllowedClinicianEmail', () => {
  it('should add email to whitelist for admin user', async () => {
    // Mock admin user
    mockGetCurrentDbUser.mockResolvedValue({
      success: { role: 'ADMIN' },
    });

    const result = await addAllowedClinicianEmail({
      email: 'doctor@hospital.com',
    });

    expect(result.success).toBeDefined();
    expect(result.success?.email).toBe('doctor@hospital.com');
  });

  it('should reject non-admin users', async () => {
    mockGetCurrentDbUser.mockResolvedValue({
      success: { role: 'PATIENT' },
    });

    const result = await addAllowedClinicianEmail({
      email: 'doctor@hospital.com',
    });

    expect(result.error).toBe('Unauthorized');
  });
});
```

---

#### Integration Tests

```typescript
// __tests__/clinician-registration.e2e.ts
describe('Clinician Registration Flow', () => {
  it('should block non-whitelisted email', async () => {
    const page = await browser.newPage();
    await page.goto('/clinician-login');
    
    await page.fill('[name="email"]', 'not-whitelisted@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    const errorMessage = await page.textContent('.toast-error');
    expect(errorMessage).toContain('not authorized');
  });

  it('should allow whitelisted email and remove from whitelist', async () => {
    // Setup: Add email to whitelist
    await prisma.allowedClinicianEmail.create({
      data: { email: 'whitelisted@test.com' },
    });

    const page = await browser.newPage();
    await page.goto('/clinician-login');
    
    await page.fill('[name="email"]', 'whitelisted@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Verify email removed from whitelist
    const whitelistEntry = await prisma.allowedClinicianEmail.findUnique({
      where: { email: 'whitelisted@test.com' },
    });
    
    expect(whitelistEntry).toBeNull();
  });
});
```

---

## Performance Considerations

### Database Query Optimization

**Current Implementation**:
```typescript
const users = await prisma.user.findMany({
  where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
  include: {
    _count: {
      select: { diagnoses: true },
    },
  },
});
```

**Optimization Opportunities**:
1. **Indexing**: Add index on `User.role` and `User.email`
2. **Pagination**: Implement cursor-based pagination for large datasets
3. **Selective Includes**: Only include `_count` when needed
4. **Caching**: Cache user list with `revalidateTag`

---

### Recommended Database Indexes

```prisma
model User {
  // ... fields
  
  @@index([role])
  @@index([email])
  @@index([authId])
}

model AllowedClinicianEmail {
  // ... fields
  
  @@index([email])
}
```

---

### Caching Strategy

**Current**: Path revalidation on mutation

**Enhanced**:
```typescript
import { unstable_cache } from 'next/cache';

export const getCachedUsers = unstable_cache(
  async (roleFilter?: string) => {
    return await prisma.user.findMany({ /* ... */ });
  },
  ['users-list'],
  { tags: ['users'], revalidate: 300 } // 5 minutes
);
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Admin cannot access dashboard

**Symptoms**: Admin login succeeds but redirects to wrong page

**Diagnosis**:
```bash
# Check user role in database
npx prisma studio
# Query: db.user.findFirst({ where: { email: 'admin@test.com' } })
```

**Solution**: Ensure `role` field is set to `"ADMIN"`

---

#### Issue 2: Clinician registration stuck in loop

**Symptoms**: Registration succeeds but user can't log in

**Diagnosis**:
- Check Supabase auth user exists
- Check Prisma user exists
- Verify email confirmation status

**Solution**:
```typescript
// Manually sync Supabase auth with Prisma
const supabaseUser = await supabase.auth.getUser();
await prisma.user.upsert({
  where: { email: supabaseUser.email },
  create: { /* ... */ },
  update: { /* ... */ },
});
```

---

#### Issue 3: Whitelist modal not appearing

**Symptoms**: "Add Clinician Email" button missing

**Diagnosis**:
- Check user role in session
- Verify `currentUserRole` prop passed to DataTable

**Solution**:
```tsx
// In users/page.tsx
const { success: dbUser } = await getCurrentDbUser();
const currentUserRole = dbUser?.role || "";

// Ensure role is passed
<UsersTable currentUserRole={currentUserRole} />
```

---

#### Issue 4: Database migration errors

**Symptoms**: `prisma db push` fails

**Diagnosis**:
```bash
# Check migration status
npx prisma migrate status

# Check database connection
echo $DATABASE_URL
```

**Solution**:
```bash
# Reset database (development only)
npx prisma migrate reset

# Or manually create migration
npx prisma migrate dev --name add_admin_role
```

---

## Future Enhancements

### Planned Features

1. **Bulk Email Import**: CSV upload for adding multiple clinician emails
2. **Email Expiration**: Time-limited whitelist entries (e.g., 7-day expiry)
3. **Invitation System**: Send email invitations with registration links
4. **Role Hierarchy**: Sub-roles within ADMIN (Super Admin, Organization Admin)
5. **Audit Trail**: Log all whitelist modifications with timestamps
6. **Email Templates**: Customizable invitation and welcome emails
7. **Organization Scoping**: Multi-tenant support for multiple clinics

---

### Technical Debt

1. **Type Safety**: Remove `as any` casts for DEVELOPER role
2. **Error Granularity**: More specific error messages for whitelist failures
3. **Validation**: Add password strength requirements
4. **Testing**: Increase test coverage for edge cases
5. **Documentation**: Add inline JSDoc comments for actions

---

## Related Features

### Dependencies

- **Supabase Authentication**: Core auth provider
- **Prisma ORM**: Database abstraction layer
- **next-safe-action**: Server action framework
- **Zod**: Input validation schema
- **React Hook Form**: Form state management
- **Sonner**: Toast notifications
- **TanStack Table**: Data table component

---

### Affected Features

- **Patient Onboarding**: Role-based redirect logic
- **Clinician Dashboard**: User management page
- **Authentication Middleware**: Route protection
- **Navigation System**: Dynamic menu items
- **User Profile**: Role-specific profile pages

---

## Appendix

### File Manifest

| File Path | Purpose |
|-----------|---------|
| `frontend/actions/admin-auth.ts` | Admin login/signup actions |
| `frontend/actions/email-auth.ts` | Modified clinician registration |
| `frontend/actions/manage-clinicians.ts` | Whitelist management actions |
| `frontend/app/(auth)/admin-login/page.tsx` | Admin login UI |
| `frontend/app/(auth)/clinician-login/page.tsx` | Updated clinician login UI |
| `frontend/app/(auth)/login/page.tsx` | Updated patient login UI |
| `frontend/app/(app)/(clinician)/layout.tsx` | Clinician layout protection |
| `frontend/app/(app)/(clinician)/users/page.tsx` | Users management page |
| `frontend/components/clinicians/users-page/add-clinician-email-modal.tsx` | Email whitelist modal |
| `frontend/components/clinicians/users-page/data-table.tsx` | Enhanced data table |
| `frontend/components/patient/layout/header.tsx` | Role-aware header |
| `frontend/components/patient/layout/nav-links.tsx` | Dynamic navigation |
| `frontend/constants/nav-items.ts` | Admin navigation items |
| `frontend/prisma/schema.prisma` | Database schema updates |
| `frontend/schemas/ManageClinicianEmailSchema.ts` | Email validation schema |
| `frontend/utils/supabase/proxy.ts` | Auth middleware updates |
| `frontend/utils/user.ts` | User query utilities |

---

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-13 | Initial implementation |
| - | - | - Admin authentication system |
| - | - | - Clinician email whitelist |
| - | - | - Role-based navigation |
| - | - | - Users management interface |

---

### Contact & Support

For questions or issues related to this feature:

- **Documentation**: `/docs/features/admin-auth-and-clinician-whitelist.md`
- **Implementation**: `/frontend/actions/` directory
- **Database Schema**: `/frontend/prisma/schema.prisma`
- **UI Components**: `/frontend/components/clinicians/` directory
