# Dashboard-Map Navigation Fixes

## Issues Fixed

### Issue 1: URL State Lost When Navigating from Map to Dashboard

**Problem**: The dashboard didn't read from or write to URL parameters, so when navigating back from the map, all clustering settings (k, variables, dates) were lost.

**Solution**:

- Added URL hydration to dashboard using `parseIllnessClusterNavigationQuery()`
- Dashboard now reads k, variables, and date range from URL on mount
- Added URL sync effect that updates URL when clustering settings are applied
- Dashboard URLs are now shareable and maintain state across navigation

**Files Changed**:

- `frontend/components/clinicians/dashboard-page/clustering/illness-clusters-client.tsx`

### Issue 2: Cluster Mismatch Between Dashboard and Map

**Problem**: Clicking a cluster card on the dashboard navigated to a different cluster on the map. This was caused by `mapNavigationContext` falling back to draft dates instead of the actual dates used to fetch cluster data.

**Root Cause**:

```typescript
// BEFORE (buggy):
const effectiveDateRangeStart = appliedDateRangeStart ?? dateRangeStart; // Falls back to draft dates
```

When the dashboard fetched cluster data, it used `appliedDateRangeStart` (which might be null). But when building the navigation URL, it fell back to `dateRangeStart` (the draft value), causing a mismatch.

**Solution**:

```typescript
// AFTER (correct):
// Use applied dates directly - these are the ACTUAL dates that were passed to fetchClusterData
const dateFilterParams = buildDiagnosisDateFilterParams(
  appliedDateRangeStart, // Don't fall back, use null if null
  appliedDateRangeEnd,
);
```

Now the URL always contains the exact parameters used to fetch the displayed cluster data, ensuring the map fetches with identical parameters and shows the same cluster order.

**Files Changed**:

- `frontend/components/clinicians/dashboard-page/clustering/illness-clusters-client.tsx`

## Implementation Details

### URL Hydration on Dashboard

The dashboard now:

1. Parses URL parameters on mount using `parseIllnessClusterNavigationQuery()`
2. Initializes all state from URL: k, variables, and dates
3. Falls back to defaults only if URL parameters are missing

```typescript
const initialNavigationStateRef = useRef(
  parseIllnessClusterNavigationQuery(searchParams),
);

const [k, setK] = useState<number>(initialNavigationState.k ?? initialK);

const [appliedVariables, setAppliedVariables] =
  useState<ClusterVariableSelection>({
    ...initialNavigationState.variables,
  });

// Parse URL date strings to Date objects
const [appliedDateRangeStart, setAppliedDateRangeStart] = useState<Date | null>(
  parseDateFromString(initialNavigationState.startDate),
);
```

### URL Sync Effect

The dashboard now maintains URL state with a sync effect:

```typescript
useEffect(() => {
  if (!clusterData) return; // Wait for data

  const nextQuery = serializeIllnessClusterNavigationQuery({
    k,
    variables: appliedVariables,
    startDate: mapNavigationContext.startDate,
    endDate: mapNavigationContext.endDate,
  });

  if (nextQuery === searchParams.toString()) return; // No change

  router.replace(`${pathname}?${nextQuery}`, { scroll: false });
}, [k, appliedVariables, mapNavigationContext, clusterData /* ... */]);
```

## Testing

### Test Case 1: Dashboard to Map Navigation

1. **Navigate to dashboard** at `/dashboard`
2. **Configure clustering**:
   - Set k = 5
   - Select variables: Age + Gender + District
   - Set date range: 2024-01-01 to 2024-12-31
3. **Click "Apply"**
4. **Observe URL** should update to:
   ```
   /dashboard?k=5&age=true&gender=true&district=true&time=false&start_date=2024-01-01&end_date=2024-12-31
   ```
5. **Click on "Group 2" card**
6. **Verify map URL**:
   ```
   /map?tab=by-cluster&cluster=2&k=5&age=true&gender=true&district=true&time=false&start_date=2024-01-01&end_date=2024-12-31
   ```
7. **Verify map displays "Group 2"** with the same data as dashboard Group 2

### Test Case 2: Map to Dashboard Navigation

1. **Navigate to map** with URL:
   ```
   /map?tab=by-cluster&cluster=3&k=4&age=true&gender=false&district=true&time=true&start_date=2024-06-01&end_date=2024-06-30
   ```
2. **Navigate to dashboard** (via sidebar or back button)
3. **Verify dashboard URL** preserves parameters:
   ```
   /dashboard?k=4&age=true&gender=false&district=true&time=true&start_date=2024-06-01&end_date=2024-06-30
   ```
4. **Verify dashboard state**:
   - k = 4 groups
   - Variables: Age + District + Diagnosis date (Gender unchecked)
   - Date range: June 2024
5. **Verify cluster data matches** what was shown on map

### Test Case 3: Direct URL Access

1. **Copy a dashboard URL** with parameters
2. **Paste into new browser tab**
3. **Verify dashboard loads** with correct k, variables, and dates
4. **Verify cluster data fetches** using those parameters

### Test Case 4: Bookmarking

1. **Configure specific dashboard settings**
2. **Apply and bookmark the page**
3. **Close browser and reopen bookmark**
4. **Verify settings are restored** from URL

## Benefits

✅ **Shareable URLs**: Dashboard and map URLs can be shared with colleagues  
✅ **Bookmarkable State**: Specific clustering configurations can be bookmarked  
✅ **Bidirectional Navigation**: State preserved when moving between dashboard and map  
✅ **Consistent Cluster Mapping**: Clicking dashboard Group N always shows Group N on map  
✅ **Deep Linking**: Direct links to specific cluster views work correctly

## Related Files

- Phase 2-3 implementation: `frontend/types/illness-cluster-settings.ts`
- Phase 2-3 implementation: `frontend/utils/illness-cluster-navigation.ts`
- Phase 4 edge cases: `frontend/utils/__tests__/illness-cluster-navigation.edge-cases.md`
