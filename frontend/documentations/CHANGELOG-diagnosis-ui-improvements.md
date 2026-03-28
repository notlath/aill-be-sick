# Changelog: Diagnosis UI Improvements

**Branch:** `redesign/diagnosis-ux`  
**Date:** March 28, 2026  
**Status:** Uncommitted changes

---

## Summary

This changeset introduces several UI improvements to the diagnosis flow: auto-resizing textarea for symptom input, improved border styling using DaisyUI tokens, padding refinements in the chat window, theme-aware insights modal, and removal of the modelUsed field from the history view.

---

## Problem Statement

1. **Fixed-height textarea limitations**: The symptom input textarea had a static height that didn't adapt to content, causing poor user experience for longer inputs.
2. **Inconsistent border styling**: Border classes used hardcoded DaisyUI opacity values instead of theme-consistent `border-border` token.
3. **Insights modal theme support**: The importance color highlighting didn't adapt to light/dark mode, causing readability issues.
4. **Unnecessary model information**: The `modelUsed` field was displayed in history but provided little value to patients.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/app/(app)/(patient)/diagnosis/page.tsx` | Modified | Auto-resizing textarea with height bounds |
| `frontend/app/(app)/(patient)/history/page.tsx` | Modified | Removed modelUsed from history and PDF export |
| `frontend/components/patient/diagnosis-page/chat-window.tsx` | Modified | Added bottom padding to messages container |
| `frontend/components/patient/diagnosis-page/diagnosis-form.tsx` | Modified | Border styling improvements |
| `frontend/components/patient/diagnosis-page/insights-modal.tsx` | Modified | Theme-aware importance colors |
| `frontend/components/patient/history-page/columns.tsx` | Modified | Removed modelUsed column |
| `frontend/components/patient/history-page/data-table.tsx` | Modified | Removed modelUsed from row display |

---

## Detailed Changes

### 1. Auto-Resizing Textarea (`diagnosis/page.tsx`)

**Location:** `frontend/app/(app)/(patient)/diagnosis/page.tsx`

**Changes:**
- Added `useCallback` import and `textareaRef` for direct DOM manipulation
- Created `adjustTextareaHeight` function that dynamically resizes textarea
- Added `onChange` handler to update value and adjust height simultaneously
- Textarea now has `min-h-[44px]` and `max-h-[200px]` bounds

**Key implementation:**
```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null);

const adjustTextareaHeight = useCallback(() => {
  const textarea = textareaRef.current;
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
}, []);

// In onChange handler:
onChange={(e) => {
  form.setValue("symptoms", e.target.value);
  adjustTextareaHeight();
}}
```

**Why:**
- Allows users to write longer symptom descriptions without scrolling within a tiny textarea
- Caps height at 200px to prevent excessive vertical growth
- Resets to default height (44px) after form submission

---

### 2. History Model Removal (`history/page.tsx`, `columns.tsx`, `data-table.tsx`)

**Locations:**
- `frontend/app/(app)/(patient)/history/page.tsx`
- `frontend/components/patient/history-page/columns.tsx`
- `frontend/components/patient/history-page/data-table.tsx`

**Changes:**
- Removed `modelUsed` field from data transformation in `ChatHistoryList`
- Removed "Model" column from `columns` definition
- Removed model badge from row display in `data-table.tsx`
- Removed model column from PDF export schema

**Why:**
- Patients don't need to know which AI model generated their diagnosis
- Reduces visual clutter in the history table
- Simplifies PDF export output

---

### 3. Chat Window Padding (`chat-window.tsx`)

**Location:** `frontend/components/patient/diagnosis-page/chat-window.tsx`

**Change:**
```tsx
// Before:
<div className="flex-1 overflow-y-auto ...">

// After:
<div className="flex-1 overflow-y-auto ... pb-8">
```

**Why:**
- Adds breathing room at the bottom of the messages area
- Prevents content from feeling cramped against the viewport edge

---

### 4. Border Styling Improvements (`diagnosis-form.tsx`)

**Location:** `frontend/components/patient/diagnosis-page/diagnosis-form.tsx`

**Changes:**
- Replaced hardcoded `border-base-300/40` with theme token `border-border`
- Applied consistent `border border-border` to both the form container and checklist button

**Before:**
```tsx
className={`... border rounded-2xl ${
  disabled || isPending
    ? "bg-base-200/60 border-base-300/40 ..."
    : isBelowMin
      ? "... border-warning/60 ..."
      : "... border-base-300/40 ..."`}
```

**After:**
```tsx
className={`... border border-border rounded-2xl ${
  disabled || isPending
    ? "bg-base-200/60 ..."
    : isBelowMin
      ? "... border-warning/60 ..."
      : "..."}`}
```

**Why:**
- Uses DaisyUI's semantic `border-border` token for consistency
- Easier to maintain if theme colors change
- Matches other form inputs in the application

---

### 5. Theme-Aware Insights Modal (`insights-modal.tsx`)

**Location:** `frontend/components/patient/diagnosis-page/insights-modal.tsx`

**Changes:**
- Added `useTheme` hook import from `next-themes`
- Replaced inline `getImportanceColor` function with imported `getImportanceStyle` utility
- Applied dynamic `isDark` state to importance color calculations

**Before:**
```tsx
function getImportanceColor(importance: number): string {
  if (importance >= 0.8) return "bg-info/40 text-base-content font-bold border border-info/50";
  // ... more conditions
}
```

**After:**
```tsx
const { theme } = useTheme();
const isDark = theme === "dark";

// In render:
style={getImportanceStyle(t.importance, isDark)}
```

**Why:**
- Insights modal now adapts to light/dark mode for better readability
- Uses centralized `getImportanceStyle` utility for consistency across components
- Removes duplicated color logic

---

## UI/UX Improvements

| Improvement | Description |
|-------------|-------------|
| **Auto-resizing textarea** | Textarea grows with content up to 200px, then scrolls |
| **Consistent borders** | Uses semantic `border-border` token throughout |
| **Theme-aware insights** | Importance colors adapt to light/dark mode |
| **Cleaner history** | Removed unnecessary model information from patient view |
| **Improved spacing** | Added padding to chat messages area |

---

## Technical Notes

### Why use `useCallback` for height adjustment?

The `adjustTextareaHeight` function is wrapped in `useCallback` to maintain referential equality across re-renders, preventing unnecessary effect triggers when used as a dependency.

### Why `border-border` token?

DaisyUI's `border-border` is a semantic token that maps to the theme's actual border color. Using it directly rather than compositing opacity values (`border-base-300/40`) ensures consistency and easier theme maintenance.

---

## Testing Checklist

- [ ] Type long symptom descriptions and verify textarea grows
- [ ] Verify textarea resets to default height after submission
- [ ] Toggle light/dark mode and verify insights modal colors adapt
- [ ] Check history table and PDF export no longer show model information
- [ ] Verify chat window has proper bottom spacing
- [ ] Test checklist button styling in both disabled and enabled states
- [ ] Mobile viewport testing for textarea resize behavior

---

## Related Changes

This changeset builds on previous commits including:
- Symptom checklist UI fixes (commit `8acacce`)
- CDSS summary redesign with FDA compliance
- Chat bubble redesign with confidence tiers

See `CHANGELOG-symptom-checklist-ui-fixes.md` and `CHANGELOG-redesign-diagnosis-ux.md` for full details.
