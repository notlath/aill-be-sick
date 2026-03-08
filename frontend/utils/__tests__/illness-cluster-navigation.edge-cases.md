# Illness Cluster Navigation Edge Case Tests

This document verifies that the URL parsing and serialization functions handle edge cases gracefully.

## Test Cases

### 1. Cluster Index Out of Bounds

**Input URL**: `?tab=by-cluster&cluster=100&k=3`
**Expected Behavior**:

- Cluster display clamped to "3" (max cluster for k=3)
- URL re-serialized as `?tab=by-cluster&cluster=3&k=3&...`

**Validation**:

- `parseIllnessClusterNavigationQuery` calls `normalizeClusterDisplay(cluster, k)`
- `normalizeClusterDisplay("100", 3)` returns `"3"`

### 2. Invalid Date Format

**Input URL**: `?start_date=2024-13-45&end_date=2024-12-31`
**Expected Behavior**:

- Invalid start date discarded
- Both dates set to undefined (incomplete range)
- Falls back to global date store values

**Validation**:

- `isValidDateValue("2024-13-45")` returns `false`
- `validateDateRange` returns `{ startDate: undefined, endDate: undefined }`

### 3. Start Date After End Date

**Input URL**: `?start_date=2024-12-31&end_date=2024-01-01`
**Expected Behavior**:

- Date range rejected as invalid
- Both dates set to undefined
- Falls back to global date store values

**Validation**:

- `validateDateRange("2024-12-31", "2024-01-01")` detects `start > end`
- Returns `{ startDate: undefined, endDate: undefined }`

### 4. Invalid K Value

**Input URL**: `?k=100`
**Expected Behavior**:

- K clamped to MAX_CLUSTER_COUNT (25)

**Input URL**: `?k=1`
**Expected Behavior**:

- K clamped to MIN_CLUSTER_COUNT (2)

**Input URL**: `?k=invalid`
**Expected Behavior**:

- K falls back to DEFAULT_CLUSTER_COUNT (4)

**Validation**:

- `clampClusterCount(100)` returns `25`
- `clampClusterCount(1)` returns `2`
- `clampClusterCount(NaN)` returns `4` (fallback)

### 5. Invalid Variable Selection

**Input URL**: `?age=false&gender=false&district=false&time=false`
**Expected Behavior**:

- All variables false is invalid
- Falls back to DEFAULT_CLUSTER_VARIABLES

**Validation**:

- `normalizeClusterVariables({ age: false, gender: false, district: false, time: false })`
- Returns `DEFAULT_CLUSTER_VARIABLES` (at least one variable must be true)

### 6. Invalid Tab

**Input URL**: `?tab=invalid-tab`
**Expected Behavior**:

- Tab falls back to "by-cluster"

**Validation**:

- `normalizeMapTab("invalid-tab")` returns `"by-cluster"`

### 7. Missing Parameters

**Input URL**: `?` (empty query string)
**Expected Behavior**:

- All parameters use defaults
- tab: "by-cluster"
- cluster: "1"
- k: 4
- variables: DEFAULT_CLUSTER_VARIABLES
- dates: undefined (use global store)

### 8. Malformed Boolean Variables

**Input URL**: `?age=yes&gender=no&district=maybe&time=1`
**Expected Behavior**:

- Invalid boolean values treated as undefined
- Falls back to defaults for undefined values
- "1" for `time` is valid (parsed as true)

**Validation**:

- `parseBooleanValue("yes")` returns `undefined`
- `parseBooleanValue("no")` returns `undefined`
- `parseBooleanValue("maybe")` returns `undefined`
- `parseBooleanValue("1")` returns `true`

### 9. Cluster Display Changes When K Reduced

**Scenario**: User is viewing cluster 8 out of 10, then changes k to 3
**Expected Behavior**:

- `serializeIllnessClusterNavigationQuery({ clusterDisplay: 8, k: 3 })`
- Cluster display clamped to "3" in the serialized URL
- URL becomes `?cluster=3&k=3&...`

### 10. URL with Only Date Range (No Cluster/K)

**Input URL**: `?start_date=2024-01-01&end_date=2024-12-31`
**Expected Behavior**:

- Dates preserved
- Other parameters use defaults
- Cluster: "1", k: 4, etc.

## Implementation Status

✅ All edge cases handled gracefully with proper validation and fallbacks
✅ No exceptions thrown for invalid input
✅ Validation functions ensure type safety and data integrity
✅ URL state always represents a valid cluster configuration
