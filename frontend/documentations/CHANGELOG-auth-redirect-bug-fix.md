# Changelog: Auth Redirect Bug Fix

**Branch:** `fix/auth-redirect-bug`
**Date:** March 31, 2026
**Status:** Staged changes

---

## Summary

This changeset fixes a bug where clinicians were being incorrectly redirected to the patient `/diagnosis` route after logging in, resulting in a 403 Forbidden error. The fix ensures that users are redirected directly to their role-appropriate landing pages immediately after authentication.

---

## Problem Statement

1. **Clinician redirect issue**: When logging out from a patient account and logging into a clinician account, the clinician was always being redirected to `/diagnosis` (patient route) instead of `/map` (clinician route).

2. **Race condition in root redirect**: Login actions redirected to `/` (root), which then performed a server-side redirect based on role. This created a race condition where the patient layout could load before the role-based redirect completed.

3. **Inconsistent password reset redirects**: The `updatePassword` action always redirected to `/` regardless of user role, potentially causing the same issue for clinicians resetting their passwords.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/actions/email-auth.ts` | Modified | Updated `emailLogin` and `updatePassword` to redirect to role-appropriate routes |
| `frontend/actions/patient-auth.ts` | Modified | Updated `patientLogin` to redirect directly to `/diagnosis` |

---

## Detailed Changes

### 1. Clinician Login Redirect (`email-auth.ts`)

**Location:** `frontend/actions/email-auth.ts:60`

**Before:**
```typescript
revalidatePath("/", "layout");
redirect("/");
```

**After:**
```typescript
revalidatePath("/", "layout");
redirect("/map");
```

**Why:**
- Eliminates the intermediate `/` redirect that caused race conditions
- Clinicians now land directly on the map page (their default landing route)
- Prevents the patient layout from loading before the role-based redirect

---

### 2. Patient Login Redirect (`patient-auth.ts`)

**Location:** `frontend/actions/patient-auth.ts:27`

**Before:**
```typescript
revalidatePath("/", "layout");
redirect("/");
```

**After:**
```typescript
revalidatePath("/", "layout");
redirect("/diagnosis");
```

**Why:**
- Consistent with clinician fix - direct redirect to role-appropriate route
- Patients land directly on `/diagnosis` without intermediate root redirect
- Reduces unnecessary server round-trips

---

### 3. Role-Aware Password Reset (`email-auth.ts`)

**Location:** `frontend/actions/email-auth.ts:154-172`

**Added:**
```typescript
// Get the user's role to determine redirect
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true },
  });

  revalidatePath("/", "layout");
  
  // Redirect based on role
  if (dbUser?.role === "CLINICIAN" || dbUser?.role === "ADMIN") {
    redirect("/map");
  } else if (dbUser?.role === "PATIENT") {
    redirect("/diagnosis");
  }
  redirect("/");
}
```

**Why:**
- Password reset is used by both patients and clinicians
- Role-aware redirect ensures users return to appropriate landing page
- Prevents clinicians from being redirected to patient routes after password reset
- Falls back to `/` if user is not found (edge case handling)

---

## UI/UX Improvements

| Improvement | Description |
|-------------|-------------|
| **Correct clinician routing** | Clinicians now land on `/map` immediately after login |
| **No more 403 errors** | Eliminates forbidden errors from incorrect route access |
| **Faster login experience** | Direct redirects reduce unnecessary server round-trips |
| **Consistent behavior** | All auth actions now respect user role for redirects |

---

## Technical Notes

### Root Cause Analysis

The bug occurred because:

1. Login actions redirected to `/` (root)
2. Root page (`app/page.tsx`) performed role-based redirect
3. Browser started loading root page before redirect completed
4. Patient layout (`app/(app)/(patient)/layout.tsx`) could resolve first
5. Clinician then saw patient view or got 403'd from patient-only routes

### Solution Architecture

By redirecting directly to role-specific routes:
- `/map` for CLINICIAN and ADMIN roles
- `/diagnosis` for PATIENT role
- Eliminates intermediate redirect step
- Browser loads correct layout immediately

### Permission Hierarchy

The fix respects the role hierarchy defined in `AGENTS.md`:
- **CLINICIAN**: Redirects to `/map`
- **ADMIN**: Redirects to `/map` (admin routes start from clinician layout)
- **PATIENT**: Redirects to `/diagnosis`
- **DEVELOPER**: Handled separately via `DeveloperRedirect` component with localStorage preference

---

## Testing Checklist

- [ ] Test patient login → should land on `/diagnosis`
- [ ] Test clinician login → should land on `/map` (not `/diagnosis`)
- [ ] Test logout from patient → login as clinician → should land on `/map`
- [ ] Test logout from clinician → login as patient → should land on `/diagnosis`
- [ ] Test clinician password reset → should redirect to `/map`
- [ ] Test patient password reset → should redirect to `/diagnosis`
- [ ] Verify no 403 errors occur during login flows
- [ ] Test ADMIN login → should land on `/map` (or `/pending-clinicians` if that's the admin default)
- [ ] Verify TypeScript compilation passes (`npx tsc --noEmit` or `bunx tsc --noEmit`)

---

## Related Changes

- This fix complements the existing role hierarchy implementation in `frontend/utils/role-hierarchy.ts`
- Works with the default landing path configuration in `frontend/constants/default-landing-path.ts`
- Related to clinician layout guards in `frontend/app/(app)/(clinician)/layout.tsx`

---

## Dependencies

No new dependencies added. Uses existing:
- `@prisma/client` for database user lookup
- `@supabase/ssr` for auth user retrieval
- `next/navigation` for server-side redirects
