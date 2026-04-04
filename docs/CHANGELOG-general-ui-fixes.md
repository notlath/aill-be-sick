# Changelog: General UI Fixes

**Branch:** `update/general-ui-fixes`  
**Date:** April 4, 2026  
**Status:** Staged changes

---

## Summary

This changeset addresses several UI consistency and styling issues across the application, including theme toggle reliability, profile form visual consistency, data table layout improvements, and date picker height alignment.

---

## Problem Statement

1. **Theme toggle using wrong property** — The theme toggle was reading from `theme` instead of `resolvedTheme`, causing incorrect theme state detection in certain scenarios.
2. **Profile form visual inconsistencies** — Mixed background styles (`bg-base-100/80 backdrop-blur-sm` vs `bg-base-200`) and missing consistent input backgrounds created visual jarring between sections.
3. **Data table textarea overflow** — Rejection reason textareas in pending diagnoses and inconclusive diagnoses tables lacked proper width and flex constraints, causing layout issues.
4. **Date picker height mismatch** — The date picker component was missing an explicit height class, causing misalignment with other form inputs.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/components/shared/theme-toggle.tsx` | Modified | Fixed theme state detection using `resolvedTheme` |
| `frontend/components/patient/profile/profile-form.tsx` | Modified | Standardized backgrounds and removed unused import |
| `frontend/components/clinicians/pending-diagnoses-page/data-table.tsx` | Modified | Fixed rejection textarea layout |
| `frontend/components/clinicians/healthcare-reports-page/inconclusive-data-table.tsx` | Modified | Fixed rejection textarea layout |
| `frontend/components/ui/date-picker.tsx` | Modified | Added explicit height class |

---

## Detailed Changes

### 1. Theme Toggle: Use `resolvedTheme` Instead of `theme`

**Location:** `frontend/components/shared/theme-toggle.tsx:10,20`

**Before:**
```tsx
const { theme, setTheme } = useTheme();
// ...
const isDark = theme === "dark";
```

**After:**
```tsx
const { resolvedTheme, setTheme } = useTheme();
// ...
const isDark = resolvedTheme === "dark";
```

**Why:** The `resolvedTheme` property from next-themes accounts for system preference detection (e.g., OS-level dark mode), whereas `theme` only reflects the explicitly set theme. This ensures the toggle icon correctly reflects what the user actually sees, especially on initial load before manual theme selection.

---

### 2. Profile Form: Standardize Backgrounds and Remove Unused Import

**Location:** `frontend/components/patient/profile/profile-form.tsx:1,3,291,359,374,395,447`

**Changes:**

**Removed unused import:**
```tsx
// Before
import { useState, useRef, useEffect, useMemo, useCallback, useTransition } from "react";

// After
import { useState, useRef, useEffect, useCallback, useTransition } from "react";
```

**Section backgrounds standardized:**
```tsx
// Profile card - Before
<section className="bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm overflow-hidden">

// Profile card - After
<section className="rounded-2xl bg-base-200 border border-border shadow-sm">
```

```tsx
// Location section - Before
<section className="bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm p-8">

// Location section - After
<section className="rounded-2xl bg-base-200 border border-border shadow-sm p-8">
```

**Input backgrounds standardized:**
```tsx
// Name input
className="flex-1 bg-base-100"

// Email input (disabled)
className="pr-10 bg-base-100"  // Was: bg-base-200/50

// Gender select trigger
className="w-full bg-base-100"

// Header gradient container
className="relative h-32 overflow rounded-t-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20"
```

**Why:** 
- Removed `useMemo` import as it was unused, reducing bundle size slightly
- Changed from semi-transparent `bg-base-100/80` with backdrop blur to solid `bg-base-200` for better visual consistency and performance (backdrop blur can be expensive on lower-end devices)
- Standardized all input backgrounds to `bg-base-100` to ensure proper contrast against the `bg-base-200` card backgrounds
- Changed `overflow-hidden` to `overflow` on header gradient to maintain rounded corner clipping without hiding content

---

### 3. Data Tables: Fix Rejection Textarea Layout

**Location:** 
- `frontend/components/clinicians/pending-diagnoses-page/data-table.tsx:487,492`
- `frontend/components/clinicians/healthcare-reports-page/inconclusive-data-table.tsx:487,492`

**Before:**
```tsx
<div className="form-control">
  <label className="label">
    <span className="label-text">Reason (optional)</span>
  </label>
  <textarea
    className="textarea textarea-bordered h-24"
    placeholder="Enter a reason for rejection..."
```

**After:**
```tsx
<div className="form-control flex flex-col gap-1">
  <label className="label">
    <span className="label-text">Reason (optional)</span>
  </label>
  <textarea
    className="textarea textarea-bordered h-24 w-full"
    placeholder="Enter a reason for rejection..."
```

**Why:** 
- Added `flex flex-col gap-1` to the form-control wrapper to ensure proper vertical spacing and layout consistency
- Added `w-full` to textarea to prevent it from shrinking below the modal width, ensuring the rejection reason input is clearly visible and usable

---

### 4. Date Picker: Add Explicit Height

**Location:** `frontend/components/ui/date-picker.tsx:107`

**Before:**
```tsx
className={cn(
  "flex items-center gap-2 justify-start",
  "px-4 py-2.5 rounded-[10px]",
  "bg-base-200 backdrop-blur-sm",
```

**After:**
```tsx
className={cn(
  "flex items-center gap-2 justify-start",
  "px-4 h-10 py-2.5 rounded-[10px]",
  "bg-base-200 backdrop-blur-sm",
```

**Why:** Added explicit `h-10` height class to match standard input heights across the application (Tailwind's default form input height). This ensures the date picker aligns properly with other form inputs in dialogs and forms.

---

## UI/UX Improvements

- **Theme toggle accuracy**: Icon now correctly reflects the actual rendered theme state, including system preference detection
- **Profile form consistency**: All sections now use uniform `bg-base-200` backgrounds with consistent `bg-base-100` input fields for better visual hierarchy
- **Rejection dialog layout**: Textarea inputs in rejection modals now span full width with proper spacing
- **Date picker alignment**: Component height now matches other form inputs for consistent form layouts

---

## Technical Notes

- **next-themes property usage**: `resolvedTheme` vs `theme` is a common gotcha — `resolvedTheme` accounts for system preferences and is generally what you want for display logic
- **Backdrop blur removal**: Removed `backdrop-blur-sm` from profile sections as it was inconsistently applied and can cause performance issues on lower-end devices; solid backgrounds are more reliable
- **Unused import cleanup**: Removed `useMemo` from React imports in profile-form.tsx as it was no longer referenced

---

## Testing Checklist

- [ ] Theme toggle icon correctly reflects system dark/light mode on initial load
- [ ] Theme toggle icon updates when OS theme changes (if supported)
- [ ] Profile form sections have consistent backgrounds across light/dark themes
- [ ] Profile form inputs have proper contrast against card backgrounds
- [ ] Rejection textarea in pending diagnoses modal spans full width
- [ ] Rejection textarea in inconclusive diagnoses modal spans full width
- [ ] Date picker height matches other form inputs in dialogs/forms
- [ ] No visual regressions on mobile viewports (test at 375px width)
- [ ] Verify `useMemo` removal doesn't break profile form functionality

---

## Related Changes

- Previous UI consistency fixes: See `CHANGELOG-diagnosis-verification-types.md` for related clinician UI improvements
- Theme system: Part of ongoing theme reliability improvements
