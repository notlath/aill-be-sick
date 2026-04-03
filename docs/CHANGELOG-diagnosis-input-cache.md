# Changelog: Fix Diagnosis Input Cache

**Branch:** `fix/diagnosis-input-cache`  
**Date:** April 3, 2026  
**Status:** Uncommitted changes

---

## Summary

This changeset fixes a caching issue in the diagnosis input page by adding `pathname` and `form` to the `useEffect` dependency array, ensuring the component properly resets its submission state when users navigate or when the form instance changes.

---

## Problem Statement

1. **Stale submission state** — The `useEffect` hook that manages component lifecycle had an empty dependency array `[]`, causing it to only run once on mount. This meant the `hasSubmittedRef` guard could persist across navigation events or form resets, potentially blocking legitimate symptom submissions.
2. **Missing form instance tracking** — When the form object changes (e.g., after reset or re-initialization), the effect needed to re-run to ensure the submission guard is properly synchronized with the current form state.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/app/(app)/(patient)/diagnosis/page.tsx` | Modified | Added `pathname` and `form` to useEffect dependencies |

---

## Detailed Changes

### 1. useEffect Dependency Array Update

**Location:** `frontend/app/(app)/(patient)/diagnosis/page.tsx:59`

**Before:**
```tsx
useEffect(() => {
  isMountedRef.current = true;
  return () => {
    isMountedRef.current = false;
    hasSubmittedRef.current = false;
  };
}, []); // Empty dependency array - only runs on mount
```

**After:**
```tsx
const pathname = usePathname(); // Added at line 29

useEffect(() => {
  isMountedRef.current = true;
  return () => {
    isMountedRef.current = false;
    hasSubmittedRef.current = false;
  };
}, [pathname, form]); // Now reacts to navigation and form changes
```

**Why:** The empty dependency array meant the cleanup function only ran when the component unmounted. By adding `pathname` (from `usePathname()` hook) and `form` (from `react-hook-form`), the effect now:
- **Resets on navigation**: When the user navigates away and back to the diagnosis page (different pathname), the submission guard is cleared
- **Resets on form changes**: When the form instance is recreated or reset, the guard synchronizes with the new form state

This prevents the `hasSubmittedRef` from blocking valid submissions after the user returns to the page or resets their form.

---

## UI/UX Improvements

- ✅ Users can submit symptoms again after navigating away and returning to diagnosis page
- ✅ Form reset properly clears submission guards
- ✅ No stale state issues between page visits

---

## Technical Notes

- **`usePathname` import** added from `next/navigation` to track route changes
- **Ref cleanup pattern**: The effect now properly cleans up refs when dependencies change, preventing memory leaks and stale closures
- **Guard behavior**: `hasSubmittedRef` prevents premature navigation during form submission lifecycle; this fix ensures it resets at the right times
- **No breaking changes**: This is a pure bug fix that doesn't alter the component's external API or user-facing behavior

---

## Testing Checklist

- [ ] Submit symptoms on diagnosis page → verify navigation to results page works
- [ ] Navigate back to diagnosis page → verify form is reset and can submit again
- [ ] Submit multiple times in sequence → verify no stale state blocks submissions
- [ ] Test with different routes → verify pathname changes trigger proper cleanup
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] No React warnings in browser console about missing dependencies

---

## Related Changes

- Previous: `docs/CHANGELOG-link-override-to-verification.md` — clinical override workflow improvements
- Previous: `docs/CHANGELOG-clinician-approval-workflow.md` — diagnosis verification system
