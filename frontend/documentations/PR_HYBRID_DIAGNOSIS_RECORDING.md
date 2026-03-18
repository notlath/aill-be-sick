# Hybrid Diagnosis Recording System with Confidence-Based Auto-Record and User Opt-Out

## What does this PR do?

This PR implements a **hybrid diagnosis recording system** that balances public health surveillance needs with user autonomy and consent. The system automatically records high-confidence diagnoses while requiring explicit user consent for low-confidence ones.

---

## Key Changes

### 1. Confidence-Based Auto-Recording (`actions/auto-record-diagnosis.ts`)

- **Auto-record threshold**: Diagnoses with **≥95% confidence** are automatically recorded after explanation generation
- **Manual consent required**: Diagnoses with **<95% confidence** skip auto-record and show Record/Discard buttons
- Returns `requiresManualRecord: true` with confidence value for low-confidence cases
- Includes full alert pipeline (anomaly + outbreak detection) for auto-recorded diagnoses

```typescript
/** Confidence threshold for auto-recording (95%) */
const AUTO_RECORD_CONFIDENCE_THRESHOLD = 0.95;

// HYBRID APPROACH: Only auto-record high-confidence diagnoses (≥95%)
// Low-confidence diagnoses require explicit user consent
if (tempDiagnosis.confidence < AUTO_RECORD_CONFIDENCE_THRESHOLD) {
  return {
    success: "Diagnosis requires manual confirmation (low confidence).",
    requiresManualRecord: true,
    confidence: tempDiagnosis.confidence,
  };
}
```

### 2. Diagnosis Discard Functionality (`actions/discard-diagnosis.ts`)

- New server action allowing users to **opt-out** of diagnosis recording
- Deletes `TempDiagnosis` and associated `Explanation` records
- Prevents discard of already-recorded diagnoses (safety guard)
- Revalidates cache and page after discard

```typescript
export const discardDiagnosis = actionClient
  .inputSchema(DiscardDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { chatId } = parsedInput;
    
    // Guard: Cannot discard recorded diagnosis
    if (chat?.hasDiagnosis) {
      return { error: "Cannot discard a recorded diagnosis." };
    }
    
    // Delete explanations, then temp diagnoses
    await prisma.explanation.deleteMany({ ... });
    await prisma.tempDiagnosis.deleteMany({ where: { chatId } });
  });
```

### 3. UI Components

#### `discard-diagnosis-btn.tsx` (New)
- Button component with success/error modals
- Red outline styling to indicate destructive action
- Disabled state handling for recorded/invalid diagnoses
- User-friendly modals for feedback

#### `chat-bubble.tsx` (Modified)
- **Low-confidence (<95%)**: Shows "Record" + "Discard" buttons side-by-side
- **High-confidence (≥95%)**: Auto-recorded, shows only "View Insights"
- **View Insights**: Now shows for ALL diagnoses (removed location dependency)

```tsx
{type === "DIAGNOSIS" && (
  <>
    {/* Low-confidence diagnoses (<95%): Show Record + Discard buttons */}
    {isLowConfidenceFinal && (
      <div className="flex gap-2 mt-4">
        {location && <RecordDiagnosisBtn ... />}
        <DiscardDiagnosisBtn chatId={chatId} disabled={...} />
      </div>
    )}
    {/* High-confidence diagnoses (≥95%): Auto-recorded, no buttons needed */}
    <ViewInsightsBtn disabled={isGettingExplanations || !explanation} />
  </>
)}
```

#### `chat-window.tsx` (Modified)
- Triggers `autoRecordExecute` after explanation is saved
- Handles both auto-record success and manual-record-required responses
- Includes detailed logging for debugging

```typescript
const { execute: autoRecordExecute } = useAction(autoRecordDiagnosis, {
  onSuccess: ({ data }) => {
    if (data?.success) {
      if (data.requiresManualRecord) {
        console.log(`Auto-record skipped (confidence ${data.confidence?.toFixed(3)})`);
      } else {
        console.log("Diagnosis auto-recorded:", data.success);
      }
    }
  },
});

// In explainDiagnosis onSuccess:
if (!chat.hasDiagnosis) {
  autoRecordExecute({
    messageId,
    chatId,
    latitude: location?.lat ?? undefined,
    longitude: location?.lng ?? undefined,
  });
}
```

### 4. Schemas

#### `AutoRecordDiagnosisSchema.ts` (New)
```typescript
export const AutoRecordDiagnosisSchema = z.object({
  messageId: z.number().min(1, "Message ID cannot be empty"),
  chatId: z.string().min(1, "Chat ID cannot be empty"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
```

#### `DiscardDiagnosisSchema.ts` (New)
```typescript
export const DiscardDiagnosisSchema = z.object({
  chatId: z.string().min(1, "Chat ID cannot be empty"),
});
```

---

## Problem Solved

### Before This PR

| Scenario | Behavior |
|----------|----------|
| User refreshes during "Generating insights..." | **Limbo state**: Explanation saved, but no Diagnosis record, `hasDiagnosis=false` |
| User doesn't want diagnosis stored | **No opt-out**: No way to discard |
| Low-confidence diagnosis | **Same as high**: No distinction in recording behavior |

### After This PR

| Scenario | Behavior |
|----------|----------|
| User refreshes during explanation | **Auto-record fires** (if confidence ≥95%) |
| User doesn't want diagnosis stored | **Discard button**: Deletes temp diagnosis + explanation |
| Low-confidence diagnosis (<95%) | **Manual consent**: Record/Discard buttons shown |
| High-confidence diagnosis (≥95%) | **Auto-recorded**: No buttons, data captured for surveillance |

---

## Files Changed

| File | Type | Lines | Description |
|------|------|-------|-------------|
| `frontend/actions/auto-record-diagnosis.ts` | Modified | +372 | Added confidence threshold logic |
| `frontend/actions/discard-diagnosis.ts` | New | +99 | User opt-out action |
| `frontend/components/patient/diagnosis-page/chat-bubble.tsx` | Modified | +31, -9 | Conditional button rendering |
| `frontend/components/patient/diagnosis-page/chat-window.tsx` | Modified | +36 | Auto-record integration |
| `frontend/components/patient/diagnosis-page/discard-diagnosis-btn.tsx` | New | +89 | Discard button + modals |
| `frontend/schemas/AutoRecordDiagnosisSchema.ts` | New | +16 | Validation schema |
| `frontend/schemas/DiscardDiagnosisSchema.ts` | New | +12 | Validation schema |

**Total**: 7 files, **646 insertions**, **9 deletions**

---

## Testing Done

### 1. Build Verification

```bash
cd frontend && npm run build
```

- ✅ TypeScript compilation passed
- ✅ Next.js build completed successfully
- ✅ All 26 pages generated without errors

### 2. Type Safety

- ✅ Fixed Prisma include error (`explanation` doesn't exist on `TempDiagnosisInclude`)
- ✅ Used separate query for explanations via `messageId` lookup

### 3. Code Flow Testing (via static analysis)

- ✅ Auto-record triggers after explanation success
- ✅ Low-confidence path returns `requiresManualRecord: true`
- ✅ Discard action guards against recorded diagnoses
- ✅ Cache revalidation on discard

### 4. UI Flow Verification

- ✅ `isLowConfidenceFinal` computed from `tempDiagnosis.confidence < 0.95`
- ✅ Buttons disabled when `chatHasDiagnosis=true` or message index mismatch
- ✅ Modals use daisyUI dialog pattern with proper cleanup

---

## Additional Notes

### Design Decisions

#### Why 95% Threshold?

- Aligns with existing `HIGH_CONFIDENCE_THRESHOLD` in the codebase
- High enough to minimize false positives in surveillance data
- Low enough to capture most legitimate diagnoses automatically

#### Why Keep Manual Recording for Low Confidence?

- **Ethical**: Users should consent to storing uncertain medical data
- **Clinical**: Low-confidence diagnoses may need human verification
- **Legal**: Reduces liability from storing potentially incorrect diagnoses

#### Why Allow Discard?

- **User autonomy**: Patients control their medical data
- **Trust**: Transparency builds system credibility
- **Edge cases**: Handles wrong chat, test diagnoses, user errors

---

### Database Impact

#### Records Affected

| Table | Action | When |
|-------|--------|------|
| `TempDiagnosis` | Deleted | On discard or after auto-record |
| `Explanation` | Deleted/Linked | Deleted on discard, linked to Diagnosis on auto-record |
| `Diagnosis` | Created | On auto-record or manual record |
| `Chat.hasDiagnosis` | Set to `true` | Only on permanent recording |

#### Data Integrity

- ✅ Cascade deletes protect against orphaned records
- ✅ Guard prevents discard of recorded diagnoses
- ✅ Revalidation ensures UI reflects database state

---

### User Experience Flow

```
Diagnosis Generated → Explanation Created
         ↓
   Confidence Check
         ↓
   ┌─────────────┬─────────────┐
   │ ≥95%        │ <95%        │
   │ (High)      │ (Low)       │
   ├─────────────┼─────────────┤
   │ Auto-record │ Show buttons│
   │ No buttons  │ Record/     │
   │ View Insights│ Discard    │
   └─────────────┴─────────────┘
```

---

### Benefits

| Benefit | Description |
|---------|-------------|
| **Public health** | High-confidence cases captured for surveillance |
| **User autonomy** | Users can discard uncertain diagnoses |
| **No limbo state** | Refresh after explanation → auto-record fires |
| **Ethical** | Explicit consent for low-confidence medical data |

---

### Security Considerations

- ✅ Authentication required (via `getCurrentDbUser`)
- ✅ Users can only discard their own diagnoses (chat-scoped)
- ✅ No cascade deletion of permanent `Diagnosis` records
- ✅ Error messages don't expose internal state

---

### Future Improvements

1. **Configurable Threshold**: Move `AUTO_RECORD_CONFIDENCE_THRESHOLD` to environment variable
2. **User Preference**: Allow users to set their own auto-record preference
3. **Audit Trail**: Log discard actions for compliance
4. **Recovery**: Add "undo discard" within session timeout window
5. **Analytics**: Track discard rate to monitor system trust

---

### Related Issues

- Fixes issue where page refresh during insight generation leaves chat in limbo state
- Addresses user consent concerns for medical data storage
- Improves surveillance data capture for high-confidence diagnoses

---

**Commit**: `c347174`  
**Branch**: `improve/system-performance`  
**Author**: notlath <qltpagsuguiron@tip.edu.ph>  
**Date**: Sun Mar 15 00:56:27 2026 +0800
