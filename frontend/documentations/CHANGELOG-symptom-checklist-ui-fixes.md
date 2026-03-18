# Changelog: Symptom Checklist UI Fixes

**Branch:** `redesign/diagnosis-ux`  
**Date:** March 18, 2026  
**Status:** Uncommitted changes (on top of commit `8acacce`)

---

## Summary

This changeset introduces a **Symptom Checklist** feature as an alternative input mode for the diagnosis flow, allowing users to select symptoms from predefined categories instead of typing free-form text. It also fixes layout shift issues in the checklist UI and adjusts page alignment for stability.

---

## Problem Statement

1. **Missing alternative input method**: Users who struggle to describe symptoms in their own words had no structured option.
2. **Layout instability**: When clicking symptom checkboxes in the checklist, the UI experienced visible "jumps" or shifts due to:
   - Conditional mounting/unmounting of the checkmark icon
   - CSS transitions on layout-affecting properties
   - Vertical centering of the page container causing perceived movement
3. **Scroll position issues**: Expanding/collapsing symptom categories caused scroll jumps because raw `scrollTop` was preserved instead of anchoring to the clicked element.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/app/(app)/(patient)/diagnosis/page.tsx` | Modified | Page alignment fix |
| `frontend/components/patient/diagnosis-page/starting-diagnosis-form.tsx` | Modified | Added checklist mode toggle and integration |
| `frontend/components/patient/diagnosis-page/diagnosis-form.tsx` | Modified | Added checklist mode toggle and integration |
| `frontend/components/patient/diagnosis-page/symptom-checklist.tsx` | **New** | Reusable checklist component |
| `frontend/constants/symptom-options.ts` | **New** | Symptom data organized by body system |
| `frontend/hooks/use-symptom-checklist.ts` | **New** | State management hook for checklist |

---

## Detailed Changes

### 1. Page Alignment Fix (`diagnosis/page.tsx`)

**Location:** `frontend/app/(app)/(patient)/diagnosis/page.tsx:7`

**Before:**
```tsx
<main className="relative flex flex-col justify-center items-center space-y-12 h-full min-h-[80vh] bg-black overflow-hidden">
```

**After:**
```tsx
<main className="relative flex flex-col justify-start items-center space-y-12 h-full min-h-[80vh] pt-16 md:pt-20 bg-black overflow-hidden">
```

**Why:**
- Changed from `justify-center` to `justify-start` with explicit top padding
- Prevents the form from "floating" in the center and shifting when internal content height changes
- The checklist mode has variable height based on expanded sections; vertical centering amplified perceived layout shift

---

### 2. Starting Diagnosis Form (`starting-diagnosis-form.tsx`)

**Location:** `frontend/components/patient/diagnosis-page/starting-diagnosis-form.tsx`

**Changes:**
- Added `InputMode` type (`"text" | "checklist"`)
- Added mode toggle UI with "Describe" and "Checklist" buttons
- Integrated `useSymptomChecklist` hook for state management
- Added language toggle support (English/Filipino)
- Conditional rendering of text input vs. `SymptomChecklist` component
- New `handleChecklistSubmit` function that converts selected symptoms to a phrase

**Key additions:**
```tsx
const [mode, setMode] = useState<InputMode>("text");
const [language, setLanguage] = useState<Language>("en");
const checklist = useSymptomChecklist(language);
```

**Mode toggle UI:**
```tsx
<div className="flex items-center justify-center gap-1 bg-base-200/50 rounded-xl p-1">
  <button onClick={() => setMode("text")}>Describe</button>
  <button onClick={() => setMode("checklist")}>Checklist</button>
</div>
```

---

### 3. Diagnosis Form (`diagnosis-form.tsx`)

**Location:** `frontend/components/patient/diagnosis-page/diagnosis-form.tsx`

**Changes:**
- Same mode toggle pattern as `StartingDiagnosisForm`
- Mode toggle only visible when form is interactive (not disabled/pending)
- Integrated `SymptomChecklist` component with all necessary props
- Renamed `handleSubmit` to `handleTextSubmit` for clarity

---

### 4. Symptom Checklist Component (`symptom-checklist.tsx`)

**Location:** `frontend/components/patient/diagnosis-page/symptom-checklist.tsx`

**New file (283 lines)** - A reusable component for selecting symptoms via checkboxes.

#### Features:
- **Collapsible sections** by body system (General, Head, Respiratory, Digestive, Skin)
- **Bilingual support** (English/Filipino) with toggle button
- **Generated phrase preview** showing the NLP-ready text
- **Validation** requiring minimum 2 symptoms before submission
- **Fixed-height scroll container** (350px) to prevent layout shift

#### Layout Shift Fixes:

**Fix 1: Anchor-based scroll preservation**

Instead of saving raw `scrollTop`, the component now anchors to the clicked section header:

```tsx
const toggleSection = (sectionId: string) => {
  const container = scrollContainerRef.current;
  const header = sectionHeaderRefs.current[sectionId];

  if (container && header) {
    const containerTop = container.getBoundingClientRect().top;
    const headerTop = header.getBoundingClientRect().top;
    scrollAnchorRef.current = {
      sectionId,
      top: headerTop - containerTop,
    };
  }
  // ... toggle state
};

useLayoutEffect(() => {
  const anchor = scrollAnchorRef.current;
  if (!anchor) return;
  // Restore header to same visual position after render
  const delta = headerTop - containerTop - anchor.top;
  if (delta !== 0) container.scrollTop += delta;
}, [expandedSections]);
```

**Fix 2: Always-rendered checkmark icon**

```tsx
// Before (causes layout shift on mount/unmount):
{isChecked && <Check className="size-3" />}

// After (opacity toggle, no DOM change):
<Check className={`size-3 ${isChecked ? "opacity-100" : "opacity-0"}`} />
```

**Fix 3: Removed transition-all from checkbox items**

```tsx
// Before:
className="... transition-all duration-200 ..."

// After:
className="... border ..."  // No transition on layout properties
```

**Fix 4: Scroll container optimization**

```tsx
// Before:
className="... overflow-y-scroll ..."

// After:
className="... overflow-y-auto will-change-scroll ..."
```

**Fix 5: Always-rendered badge with opacity toggle**

```tsx
<span
  className={`badge badge-primary badge-xs ${
    checkedInCategory > 0 ? "opacity-100" : "opacity-0"
  }`}
>
  {checkedInCategory || 0}
</span>
```

**Fix 6: Fixed-height sections**

All major sections have explicit heights to prevent container resizing:
- Language toggle: `h-[24px]`
- Scroll container: `h-[350px]`
- Generated phrase preview: `h-[88px]`
- Submit bar: `h-[40px]`

---

### 5. Symptom Options Data (`symptom-options.ts`)

**Location:** `frontend/constants/symptom-options.ts`

**New file (390 lines)** - Defines all available symptoms organized by body system.

#### Structure:
```typescript
type SymptomOption = {
  id: string;                          // Unique stable ID
  label: { en: string; tl: string };   // User-facing checkbox label
  phrase: { en: string; tl: string };  // NLP model input phrase
};

type SymptomCategory = {
  id: string;
  title: { en: string; tl: string };
  description?: { en: string; tl: string };
  symptoms: SymptomOption[];
};
```

#### Categories:
1. **General** (8 symptoms): fever, chills, fatigue, body aches, appetite loss, onset patterns
2. **Head & Neurological** (3 symptoms): headache, eye pain, confusion
3. **Respiratory** (6 symptoms): cough types, breathing difficulty, sore throat, nasal symptoms
4. **Digestive** (6 symptoms): nausea, diarrhea, cramps, constipation, dehydration, blood in stool
5. **Skin & Eyes** (6 symptoms): various rash types, bleeding, eye symptoms, mouth spots

#### Design decisions:
- Phrases derived from `question_bank.json` to match NLP model training data
- Bilingual support for Filipino users (phrases in `question_bank_tagalog.json`)
- Minimum 2 symptoms required (`MIN_CHECKED_SYMPTOMS = 2`)

---

### 6. Symptom Checklist Hook (`use-symptom-checklist.ts`)

**Location:** `frontend/hooks/use-symptom-checklist.ts`

**New file (64 lines)** - Custom React hook managing checklist state.

#### API:
```typescript
const {
  checkedIds,       // Set<string> of selected symptom IDs
  toggle,           // (id: string) => void
  clear,            // () => void
  generatedPhrase,  // Combined NLP-ready string
  isReady,          // boolean (>= 2 symptoms selected)
  remaining,        // number of symptoms still needed
  count,            // total selected count
} = useSymptomChecklist(language);
```

#### Phrase generation:
```typescript
const generatedPhrase = useMemo(() => {
  const phrases = ALL_SYMPTOMS
    .filter((s) => checkedIds.has(s.id))
    .map((s) => s.phrase[language]);
  return phrases.join(". ") + ".";
}, [checkedIds, language]);
```

Symptoms are joined with periods to create distinct sentences the NLP model can parse effectively.

---

## UI/UX Improvements

| Improvement | Description |
|-------------|-------------|
| **Alternative input method** | Users can now select symptoms from a structured list instead of typing |
| **Bilingual support** | Full English/Filipino toggle for symptom labels and phrases |
| **Visual feedback** | Badges show count per category; status text shows progress |
| **Accessibility** | Proper `aria-live` regions, `role="status"`, semantic HTML |
| **Mobile-friendly** | Touch-friendly checkbox targets (44px min-height), responsive layout |
| **No layout shift** | All dynamic elements use opacity/fixed-height patterns |

---

## Technical Notes

### Why `useLayoutEffect` for scroll anchoring?

`useLayoutEffect` runs synchronously after DOM mutations but before paint, ensuring the scroll adjustment happens before the user sees any jump. Using `useEffect` would cause a visible flicker.

### Why `will-change-scroll`?

Hints to the browser that the element will be scrolled frequently, allowing it to optimize rendering (e.g., promote to compositor layer).

### Why opacity instead of conditional rendering?

Conditional rendering (`{condition && <Element />}`) causes React to mount/unmount DOM nodes, which can trigger layout recalculations. Opacity changes are purely visual and don't affect layout.

---

## Testing Checklist

- [ ] Toggle between "Describe" and "Checklist" modes
- [ ] Select symptoms from multiple categories
- [ ] Verify generated phrase updates in real-time
- [ ] Toggle language between English and Filipino
- [ ] Expand/collapse category sections without scroll jump
- [ ] Click checkboxes rapidly without visual glitches
- [ ] Submit with 2+ symptoms selected
- [ ] Verify form clears after successful submission
- [ ] Test on mobile viewport sizes

---

## Related Changes (Already Committed)

This changeset builds on top of commit `8acacce` which included:
- CDSS summary redesign with FDA compliance fixes
- Chat bubble redesign with confidence tiers
- Backend disease-specific knowledge references
- Database migration script for existing records

See `CHANGELOG-redesign-diagnosis-ux.md` for full details of committed changes.
