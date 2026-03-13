# Location Handling Feature

## Overview

### Purpose
This feature enables the application to request, capture, and manage user location coordinates and addresses during the onboarding process and diagnosis flow. It provides multiple methods for users to specify their location while handling various edge cases and error scenarios gracefully.

### Target Users
- **Patients**: During onboarding to provide their residential location for health tracking
- **Clinicians**: View patient location data for epidemiological analysis and health trend mapping
- **System Administrators**: Aggregate location data for disease clustering and heatmap visualizations

### Key Benefits
- **Accurate Geolocation**: Automatic capture of precise GPS coordinates
- **Address Autofill**: Mapbox-powered reverse geocoding for user-friendly address display
- **Manual Override**: Users can adjust or manually enter their address
- **Error Resilience**: Graceful handling of permission denials, timeouts, and API failures
- **Visual Confirmation**: Interactive minimap for marker adjustment and satellite view

---

## How It Works

### Core Functionality

The location handling system operates through three primary mechanisms:

1. **Browser Geolocation API**: Requests GPS coordinates from the user's device
2. **Mapbox Geocoding API**: Converts coordinates to human-readable addresses (reverse geocoding)
3. **Mapbox SearchBox**: Provides address autocomplete suggestions for manual entry
4. **AddressMinimap**: Interactive map component for visual marker adjustment

### User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Onboarding Page Loads                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Automatic Location Request (useEffect)             │
│                    requestLocation() called                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Browser Permission Prompt                      │
│            "Allow location access?" (User Decision)             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐
    │   ALLOWED ✓      │            │   DENIED ✗       │
    └──────────────────┘            └──────────────────┘
              │                               │
              ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐
    │ GPS Coordinates  │            │ Error Alert      │
    │ Retrieved        │            │ + Retry Button   │
    └──────────────────┘            └──────────────────┘
              │
              ▼
    ┌──────────────────┐
    │ Reverse Geocode  │
    │ (Mapbox API)     │
    └──────────────────┘
              │
              ├─────────────────┬──────────────────┐
              │                 │                  │
              ▼                 ▼                  ▼
    ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Success: Address │ │ API Error    │ │ No Address   │
    │ + Coordinates    │ │ Fallback:    │ │ Found        │
    │ → Form Populated │ │ Coordinates  │ │ → Warning    │
    │ + Minimap Shown  │ │ Only         │ │ + Manual     │
    └──────────────────┘ └──────────────┘ │   Entry      │
                                           └──────────────┘
              │
              ▼
    ┌──────────────────┐
    │ User Can:        │
    │ • Edit Address   │
    │ • Drag Marker    │
    │ • Use SearchBox  │
    └──────────────────┘
```

### System Integration

#### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     onboarding/page.tsx                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   useUserLocation Hook                │  │
│  │  • requestLocation() - Triggers geolocation request   │  │
│  │  • location - Stores { lat, lng, address }            │  │
│  │  • error - Error state                                │  │
│  │  • loading - Loading state                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                                │
│  ┌───────────────────────────┴───────────────────────────┐  │
│  │              Mapbox Components                        │  │
│  │  • SearchBox - Address autocomplete                   │  │
│  │  • AddressMinimap - Interactive map with draggable    │  │
│  │    marker                                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    utils/location.ts                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              getLocationDetails()                     │  │
│  │  • Server action for reverse geocoding                │  │
│  │  • Calls Mapbox Geocoding API                         │  │
│  │  • Returns { success: LocationData } | { error }      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 actions/onboarding.ts                       │
│  • Submits form data including coordinates to backend       │
│  • Creates patient profile with location metadata           │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Technical Requirements

| Dependency | Version | Purpose |
|------------|---------|---------|
| `@mapbox/search-js-react` | Latest | Mapbox SearchBox and AddressMinimap components |
| `@mapbox/search-js-core` | Latest | Mapbox TypeScript types |
| `react-hook-form` | Latest | Form state management |
| `zod` | Latest | Schema validation |

#### Environment Variables

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiLi4uIiwi...
```

**Required**: A valid Mapbox access token must be configured for geocoding and map components to function.

### Configuration

#### Fixed Location Values (Bagong Silangan, Quezon City)

The onboarding form uses fixed administrative divisions for standardization:

```typescript
const FIXED_CITY = "Quezon City";
const FIXED_BARANGAY = "Bagong Silangan";
const FIXED_REGION = "National Capital Region (NCR)";
const FIXED_PROVINCE = "NCR, Second District (Not a Province)";
```

These fields are pre-filled and disabled in the UI to ensure data consistency for the Bagong Silangan health program.

### Code Examples

#### 1. Hook Usage: `useUserLocation`

```typescript
import { useUserLocation } from "@/hooks/use-location";

function MyComponent() {
  const {
    location,      // { lat, lng, address } | null
    error,         // string | null
    loading,       // boolean
    requestLocation, // () => Promise<void>
  } = useUserLocation();

  // Auto-request on mount
  useEffect(() => {
    if (!location) requestLocation();
  }, []);

  return (
    <div>
      {error && <Alert>{error}</Alert>}
      {location && <p>Your address: {location.address}</p>}
    </div>
  );
}
```

#### 2. Handling Mapbox SearchBox Selection

```typescript
const handleAutofillRetrieve = (response: SearchBoxRetrieveResponse) => {
  const feature = response?.features?.[0];
  if (!feature) return;

  const address =
    feature.properties.full_address ||
    feature.properties.place_formatted ||
    feature.properties.name ||
    "";
  
  const [lng, lat] = feature.geometry.coordinates;

  form.setValue("address", address, { shouldValidate: true });
  form.setValue("latitude", lat);
  form.setValue("longitude", lng);
  setMinimapFeature(feature as GeoJSON.Feature<GeoJSON.Point>);
};
```

#### 3. Minimap Marker Drag Handler

```typescript
const handleSaveMarkerLocation = (coordinate: [number, number]) => {
  const [lng, lat] = coordinate;
  form.setValue("latitude", lat);
  form.setValue("longitude", lng);
  // Address is NOT automatically updated on drag
  // User must manually edit address field if needed
};
```

---

## Reference

### Parameters

#### `LocationData` Type

```typescript
type LocationData = {
  lat: number;        // Latitude in decimal degrees
  lng: number;        // Longitude in decimal degrees
  address?: string;   // Optional: Human-readable address from geocoding
};
```

#### `useUserLocation` Return Values

| Property | Type | Description |
|----------|------|-------------|
| `location` | `LocationData \| null` | Current location state |
| `error` | `string \| null` | Error message if geolocation failed |
| `loading` | `boolean` | True while requesting location |
| `requestLocation` | `() => Promise<void>` | Function to trigger location request |

#### Form Schema Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | `number` | No | Decimal latitude |
| `longitude` | `number` | No | Decimal longitude |
| `address` | `string` | **Yes** | Full street address |
| `district` | `string` | **Yes** | District/Zone name |
| `city` | `string` | **Yes** | Fixed: "Quezon City" |
| `barangay` | `string` | **Yes** | Fixed: "Bagong Silangan" |

---

### Error Handling

#### Geolocation Error Scenarios

| Error Code | User Message | Cause |
|------------|-------------|-------|
| `PERMISSION_DENIED` | "Permission denied. Please allow location access." | User rejected browser permission prompt |
| `POSITION_UNAVAILABLE` | "Position unavailable. Please try again." | GPS hardware unavailable or disabled |
| `TIMEOUT` | "Location request timed out. Please try again." | Request exceeded 10-second timeout |
| `UNSUPPORTED` | "Geolocation not supported" | Browser lacks Geolocation API |

#### Geocoding Error Scenarios

| Scenario | Behavior | Fallback |
|----------|----------|----------|
| Mapbox API unreachable | Error logged to console | Coordinates only (no address) |
| API returns non-OK status | Error logged to console | Coordinates only (no address) |
| No features in response | Error: "No address found" | Coordinates only (no address) |
| NEXT_PUBLIC_MAPBOX_TOKEN missing | Error logged to console | Coordinates only (no address) |

#### UI Error States

1. **Permission Denied Alert**
   ```tsx
   {locationError && (
     <div className="alert alert-error">
       <span>{locationError}</span>
       <button onClick={requestLocation} disabled={isLocating}>
         Retry
       </button>
     </div>
   )}
   ```

2. **Address Not Found Warning**
   ```tsx
   {location && !location.address && !isLocating && (
     <div className="alert alert-warning">
       We couldn't retrieve the address for your location.
       Please enter it manually.
     </div>
   )}
   ```

---

### Performance Considerations

| Optimization | Implementation |
|--------------|----------------|
| **SSR Compatibility** | Mapbox components dynamically imported with `{ ssr: false }` |
| **Token Configuration** | Mapbox access token set once on mount via `useEffect` |
| **Form State Efficiency** | `form.watch()` used for SearchBox value binding |
| **GeoJSON Feature Caching** | `minimapFeature` state prevents redundant feature reconstruction |

---

### Accessibility Features

- **Keyboard Navigation**: SearchBox supports arrow key navigation through suggestions
- **Screen Reader Labels**: All form fields include visible labels with required indicators
- **Focus Management**: Retry buttons maintain focus after error states
- **Visual Feedback**: Loading spinners and state indicators for all async operations

---

## Use Cases

### Scenario 1: Successful Automatic Geolocation

**Context**: User allows location access on first prompt

**Steps**:
1. Page loads → `useEffect` triggers `requestLocation()`
2. Browser shows permission prompt → User clicks "Allow"
3. GPS coordinates retrieved (e.g., `14.7391, 121.0719`)
4. `getLocationDetails()` called with coordinates
5. Mapbox returns address: "Commonwealth Avenue, Bagong Silangan, Quezon City"
6. Form auto-populated:
   - Address field filled
   - Latitude/longitude hidden fields set
   - Minimap displayed with marker at location
7. User reviews and submits form

**Expected Outcome**: Seamless onboarding with minimal user input

---

### Scenario 2: Permission Denied

**Context**: User denies location permission

**Steps**:
1. Page loads → `requestLocation()` called
2. Browser shows permission prompt → User clicks "Block"
3. `PERMISSION_DENIED` error caught
4. Error alert displayed: "Permission denied. Please allow location access."
5. User clicks "Retry" button → Step 1 repeats
6. User manually types address in SearchBox
7. User selects suggestion from dropdown
8. Minimap appears with marker at selected address

**Expected Outcome**: User can still complete onboarding via manual entry

---

### Scenario 3: Geocoding API Failure

**Context**: Coordinates retrieved but Mapbox API fails

**Steps**:
1. Geolocation succeeds → Coordinates: `14.7391, 121.0719`
2. `getLocationDetails()` called
3. Mapbox API returns 503 Service Unavailable
4. Error logged to console
5. Fallback: `setLocation({ lat: 14.7391, lng: 121.0719 })` (no address)
6. Warning alert shown: "We couldn't retrieve the address for your location."
7. User manually enters address or drags minimap marker

**Expected Outcome**: Coordinates saved; user provides address manually

---

### Scenario 4: User Adjusts Location via Minimap

**Context**: Geolocation accurate to street level but not exact building

**Steps**:
1. Initial geolocation completes → Marker placed on map
2. User notices marker is 50m off from actual residence
3. User drags marker to correct position
4. `handleSaveMarkerLocation()` fires with new `[lng, lat]`
5. Form latitude/longitude updated
6. Address field remains unchanged (user must edit manually if needed)

**Expected Outcome**: Precise coordinates captured; address reflects user's knowledge

---

### Scenario 5: Address Autofill via SearchBox

**Context**: User prefers typing address over GPS

**Steps**:
1. User skips or denies geolocation
2. User types "Commonwealth Ave, Quezon City" in SearchBox
3. Mapbox returns suggestion list
4. User selects "Commonwealth Avenue, Bagong Silangan, Quezon City, NCR, Philippines"
5. `handleAutofillRetrieve()` fires
6. Form populated with:
   - Full address from `feature.properties.full_address`
   - Coordinates from `feature.geometry.coordinates`
7. Minimap displayed at selected location

**Expected Outcome**: Address and coordinates captured without GPS

---

## Integration with Other Features

### Diagnosis Recording

Location data is attached to diagnosis records for epidemiological tracking:

```typescript
// components/patient/diagnosis-page/record-diagnosis-btn.tsx
const onSubmit = async () => {
  await createDiagnosis({
    // ... diagnosis data
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
    },
  });
};
```

### Clinician Dashboard - Heatmap Visualization

Aggregated patient locations enable disease clustering analysis:

- **By District**: Shows illness density per Bagong Silangan district
- **By Disease**: Color-coded markers for different diagnoses
- **Temporal Analysis**: Time-based filtering of outbreak patterns

### Patient Profile Management

Location data persists in patient profiles and can be updated:

```typescript
// components/patient/profile/profile-form.tsx
const handleLocationSubmit = (e: React.FormEvent) => {
  // Update patient location via server action
};
```

---

## Security and Privacy

### Data Protection Measures

| Concern | Mitigation |
|---------|------------|
| **GPS Precision** | Coordinates stored with 6 decimal places (~11cm precision) |
| **Permission Transparency** | Clear explanation of why location is needed |
| **User Control** | Manual override always available; no forced geolocation |
| **API Key Security** | Mapbox token scoped to referrer domains only |

### Compliance Considerations

- **Data Minimization**: Only location necessary for health service delivery is collected
- **Purpose Limitation**: Location used exclusively for health tracking and epidemiological analysis
- **User Consent**: Explicit browser permission required before geolocation

---

## Troubleshooting

### Common Issues

#### Issue: Minimap Not Showing

**Symptoms**: Map component renders as blank space

**Causes**:
- `NEXT_PUBLIC_MAPBOX_TOKEN` not set
- Token lacks required scopes
- Component rendered during SSR

**Solutions**:
1. Verify token exists in `.env.local`
2. Check token scopes include "Maps" and "Geocoding"
3. Ensure component uses `dynamic(() => ..., { ssr: false })`

---

#### Issue: Address Always Falls Back to Manual Entry

**Symptoms**: Geolocation succeeds but address never populates

**Causes**:
- Mapbox API rate limit exceeded
- Network connectivity issues
- Invalid coordinates (e.g., `0, 0`)

**Solutions**:
1. Check browser console for API errors
2. Verify coordinates are valid Philippine coordinates
3. Test with known-good coordinates: `14.7391, 121.0719`

---

#### Issue: SearchBox Not Returning Philippine Addresses

**Symptoms**: Suggestions are all international locations

**Causes**:
- Missing `country: "PH"` option
- Language not set to English

**Solutions**:
```typescript
<SearchBox
  options={{ language: "en", country: "PH" }}
  // ... other props
/>
```

---

## Future Enhancements

### Planned Improvements

1. **Offline Mode**: Cache last-known location for areas with poor connectivity
2. **Address Validation**: Verify address exists in Philippine Postal Service database
3. **Location History**: Allow users to save multiple addresses (home, work, etc.)
4. **Privacy Modes**: Option to fuzz coordinates to barangay-level for privacy-sensitive users

### Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No reverse geocoding for dragged marker | Address may not match marker position | User manually edits address |
| Single location per patient | Cannot track multiple residences | Update profile when moving |
| GPS accuracy depends on device | Rural areas may have poor precision | Manual address entry recommended |

---

## Related Documentation

- [Onboarding Flow](./onboarding-flow.md)
- [Patient Profile Management](./patient-profile.md)
- [Clinician Dashboard - Heatmap](./heatmap-visualization.md)
- [Diagnosis Recording](./diagnosis-recording.md)

---

**Last Updated**: March 7, 2026  
**Version**: 1.0  
**Maintained By**: Development Team
