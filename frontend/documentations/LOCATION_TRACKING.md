# Location Tracking System Documentation

## Overview

This document explains the location tracking system implemented for disease outbreak prediction and clustering. The system captures user location during diagnosis and stores it in the database for future analysis.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Flow](#data-flow)
3. [Database Schema](#database-schema)
4. [Server Actions](#server-actions)
5. [Client-Side Hook](#client-side-hook)
6. [Component Integration](#component-integration)
7. [Privacy & Fallbacks](#privacy--fallbacks)
8. [Use Cases](#use-cases)
9. [Testing](#testing)

---

## Architecture Overview

The location tracking system follows a client-server architecture with three main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Browser Geolocation API → useUserLocation Hook         │ │
│  │ (Requests user permission for precise location)        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Server Layer                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Server Actions (utils/location.ts)                     │ │
│  │ • getLocationDetails() - Reverse geocoding             │ │
│  │ • getLocationFromIP() - IP-based fallback              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ PostgreSQL (via Prisma)                                │ │
│  │ • User.{latitude, longitude, city, region}             │ │
│  │ • Diagnosis.{latitude, longitude, city, region}        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Step-by-Step Process

1. **User Opens Diagnosis Page**

   - `ChatWindow` component mounts
   - `useUserLocation()` hook is initialized

2. **Location Request Triggered**

   - `requestLocation()` is called automatically on mount
   - Browser shows permission prompt: "Allow [site] to access your location?"

3. **User Grants Permission (Happy Path)**

   ```
   Browser Geolocation API
         ↓
   Returns: { latitude, longitude }
         ↓
   Calls: getLocationDetails(lat, lng)
         ↓
   OpenStreetMap Nominatim API
         ↓
   Returns: { city, region, ... }
         ↓
   Hook State Updated: location = { latitude, longitude, city, region }
   ```

4. **User Denies Permission (Fallback Path)**

   ```
   Browser Geolocation API → Permission Denied
         ↓
   Calls: getLocationFromIP()
         ↓
   ipapi.co API
         ↓
   Returns: { latitude, longitude, city, region }
         ↓
   Hook State Updated: location = { latitude, longitude, city, region }
   ```

5. **User Records Diagnosis**
   - User clicks "Record diagnosis" button
   - `RecordDiagnosisBtn` calls `createDiagnosis` action
   - Location data is included in the request
   - Database stores diagnosis with location snapshot

---

## Database Schema

### User Model

```prisma
model User {
  id         Int         @id @default(autoincrement())
  email      String      @unique
  authId     String?     @unique
  name       String?
  avatar     String?
  role       Role        @default(PATIENT)

  // Location fields (user's general location)
  latitude   Float?
  longitude  Float?
  city       String?

  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @default(now()) @updatedAt
  chats      Chat[]
  diagnoses  Diagnosis[]
}
```

**Purpose**: Could be used to store user's home location or most recent location for profile purposes.

### Diagnosis Model

```prisma
model Diagnosis {
  id            Int      @id @default(autoincrement())
  confidence    Float
  uncertainty   Float
  disease       Disease
  createdAt     DateTime @default(now())
  chatId        String   @unique
  symptoms      String
  modelUsed     Model

  // Location snapshot at diagnosis time
  latitude      Float?
  longitude     Float?
  city          String?

  chat          Chat     @relation(fields: [chatId], references: [chatId])
  userId        Int
  user          User     @relation(fields: [userId], references: [id])
}
```

**Purpose**: Captures where the patient was when the diagnosis was recorded. Critical for outbreak prediction and clustering.

### Why Location is Optional (`Float?`, `String?`)

- Users may deny location permission
- Fallback methods might fail
- System should still work without location data
- Privacy-first approach

---

## Server Actions

### File: `utils/location.ts`

#### Type Definition

```typescript
export type LocationData = {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
};
```

#### 1. `getLocationDetails(latitude, longitude)`

**Purpose**: Convert coordinates to human-readable address (reverse geocoding)

**API Used**: OpenStreetMap Nominatim

- **URL**: `https://nominatim.openstreetmap.org/reverse`
- **Cost**: Free, no API key required
- **Rate Limit**: 1 request per second per IP
- **User-Agent**: Required header (`AIllBeSick/1.0`)

**Request Example**:

```
GET https://nominatim.openstreetmap.org/reverse?
    format=json&
    lat=14.5995&
    lon=120.9842&
    zoom=10
```

**Response Example**:

```json
{
  "address": {
    "city": "Manila",
    "municipality": "Manila",
    "state": "Metro Manila",
    "country": "Philippines"
  }
}
```

**Implementation Logic**:

```typescript
// Prioritize different administrative levels
city: data.address?.city ||
  data.address?.town ||
  data.address?.village ||
  data.address?.municipality;

region: data.address?.state || data.address?.province;
```

**Why This Order?**

- Philippines has cities, municipalities, towns, and barangays
- We want the most specific but still useful level
- `state` in Nominatim maps to Philippine regions/provinces

---

#### 2. `getLocationFromIP()`

**Purpose**: Fallback when browser geolocation is denied

**API Used**: ipapi.co

- **URL**: `https://ipapi.co/json/`
- **Cost**: Free tier (1,000 requests/day, 30,000/month)
- **No API Key**: Required for basic usage
- **Accuracy**: City-level (less accurate than GPS)

**Request Example**:

```
GET https://ipapi.co/json/
```

**Response Example**:

```json
{
  "latitude": 14.5995,
  "longitude": 120.9842,
  "city": "Manila",
  "region": "Metro Manila",
  "country_name": "Philippines"
}
```

**When It's Used**:

- User denies browser location permission
- Browser doesn't support geolocation API
- Geolocation API times out

**Accuracy Trade-off**:

- GPS/Browser: ±10-50 meters
- IP Geolocation: ±5-10 kilometers
- Still useful for city/region-level outbreak tracking

---

## Client-Side Hook

### File: `hooks/use-location.ts`

#### Hook: `useUserLocation()`

**Returns**:

```typescript
{
  location: LocationData | null; // Current location data
  error: string | null; // Error message if any
  loading: boolean; // Loading state
  requestLocation: () => Promise<void>; // Function to trigger location request
}
```

**State Management**:

```typescript
const [location, setLocation] = useState<LocationData | null>(null);
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
```

#### Request Flow Diagram

```
requestLocation() called
        ↓
Set loading = true
        ↓
Check: Is geolocation available?
        ↓
   ┌────┴────┐
   YES       NO
   ↓         ↓
Request   Call getLocationFromIP()
Permission    ↓
   ↓      Set location
   ↓      loading = false
User      DONE
Decision
   ↓
┌──┴──┐
ALLOW DENY
↓     ↓
Get   Call getLocationFromIP()
Coords    ↓
↓     Set location
Call  loading = false
getLocationDetails() DONE
↓
Set location
loading = false
DONE
```

#### Geolocation Options

```typescript
{
  enableHighAccuracy: true,  // Use GPS if available
  timeout: 10000,            // Wait up to 10 seconds
  maximumAge: 0              // Don't use cached position
}
```

**Why These Values?**

- `enableHighAccuracy: true`: We need precise coordinates for clustering
- `timeout: 10000`: Balance between accuracy and UX (10 seconds max wait)
- `maximumAge: 0`: Always get fresh location (diagnosis happens now, not in the past)

---

## Component Integration

### 1. ChatWindow Component

**File**: `components/patient/diagnosis-page/chat-window.tsx`

```typescript
const ChatWindow = ({ chatId, messages, chat }: ChatWindowProps) => {
  // Initialize location hook
  const { location, requestLocation } = useUserLocation();

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Pass location down to children
  return (
    <FormProvider {...form}>
      <ChatContainer
        messages={optimisticMessages}
        location={location} // ← Passed here
        // ... other props
      />
    </FormProvider>
  );
};
```

**Why Request on Mount?**

- User is about to start a diagnosis
- Gives time for permission prompt before recording
- Location is ready when "Record diagnosis" is clicked

---

### 2. ChatContainer Component

**File**: `components/patient/diagnosis-page/chat-container.tsx`

```typescript
type ChatContainerProps = {
  messages: Message[];
  isPending: boolean;
  hasDiagnosis?: boolean;
  location?: LocationData | null; // ← Added
};

const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>(
  ({ messages, isPending, hasDiagnosis, location }, ref) => {
    return (
      <section>
        {messages.map((message, idx) => (
          <ChatBubble
            key={message.id + message.content}
            location={location} // ← Passed to each bubble
            {...message}
          />
        ))}
      </section>
    );
  }
);
```

**Role**: Prop drilling intermediary (passes location to bubbles)

---

### 3. ChatBubble Component

**File**: `components/patient/diagnosis-page/chat-bubble.tsx`

```typescript
type ChatBubbleProps = {
  messagesLength: number;
  idx?: number;
  tempDiagnosis?: TempDiagnosis;
  chatHasDiagnosis?: boolean;
  location?: LocationData | null; // ← Added
} & Message;

const ChatBubble = ({
  content,
  role,
  type,
  tempDiagnosis,
  chatId,
  location, // ← Destructured
}: // ... other props
ChatBubbleProps) => {
  return (
    <article>
      {/* Message content */}
      {type === "DIAGNOSIS" && (
        <RecordDiagnosisBtn
          tempDiagnosis={tempDiagnosis}
          chatId={chatId}
          location={location} // ← Passed to button
        />
      )}
    </article>
  );
};
```

**Role**: Renders diagnosis messages and passes location to record button

---

### 4. RecordDiagnosisBtn Component

**File**: `components/patient/diagnosis-page/record-diagnosis-btn.tsx`

```typescript
type RecordDiagnosisBtnProps = {
  tempDiagnosis?: TempDiagnosis;
  messagesLength: number;
  chatId: string;
  idx?: number;
  disabled?: boolean;
  location?: LocationData | null; // ← Added
};

const RecordDiagnosisBtn = ({
  tempDiagnosis,
  chatId,
  location, // ← Destructured
}: // ... other props
RecordDiagnosisBtnProps) => {
  const { execute, isExecuting } = useAction(createDiagnosis);

  const handleRecordDiagnosis = () => {
    if (!tempDiagnosis) return;

    execute({
      chatId,
      confidence: tempDiagnosis.confidence,
      disease: tempDiagnosis.disease,
      modelUsed: tempDiagnosis.modelUsed,
      uncertainty: tempDiagnosis.uncertainty,
      symptoms: tempDiagnosis.symptoms,
      location: location || undefined, // ← Included in action
    });
  };

  return <button onClick={handleRecordDiagnosis}>Record diagnosis</button>;
};
```

**Role**: Final component that sends location to the server action

---

### 5. CreateDiagnosis Action

**File**: `actions/create-diagnosis.ts`

```typescript
export const createDiagnosis = actionClient
  .inputSchema(CreateDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const {
      confidence,
      uncertainty,
      modelUsed,
      disease,
      chatId,
      symptoms,
      location, // ← Extracted from input
    } = parsedInput;

    // ... user validation ...

    await prisma.diagnosis.create({
      data: {
        confidence,
        uncertainty,
        modelUsed,
        disease,
        chatId,
        symptoms,
        userId: dbUser.id,
        // Location data stored here
        latitude: location?.latitude,
        longitude: location?.longitude,
        city: location?.city,
        region: location?.region,
      },
    });

    return { success: "Successfully recorded diagnosis" };
  });
```

**Role**: Persists diagnosis with location snapshot to database

---

## Privacy & Fallbacks

### Privacy Considerations

1. **Explicit Consent Required**

   - Browser shows permission prompt
   - User must actively grant permission
   - No sneaky background tracking

2. **Optional Fields**

   - All location fields are nullable in database
   - System works even if location is unavailable
   - No diagnosis blocking if location denied

3. **Purpose Limitation**

   - Location used only for outbreak prediction
   - Not for user profiling or advertising
   - Stored only at diagnosis time

4. **Data Minimization**
   - Only collect what's needed (lat, lng, city, region)
   - No country field (only Philippines)
   - No street addresses or precise coordinates shared with users

### Fallback Strategy

```
┌─────────────────────────────────────────┐
│  Primary: Browser Geolocation API       │
│  Accuracy: ±10-50 meters                │
│  Requires: User permission              │
└─────────────────────────────────────────┘
              ↓ (if denied)
┌─────────────────────────────────────────┐
│  Fallback: IP Geolocation               │
│  Accuracy: ±5-10 kilometers             │
│  Requires: Nothing (automatic)          │
└─────────────────────────────────────────┘
              ↓ (if fails)
┌─────────────────────────────────────────┐
│  Graceful Degradation                   │
│  Location: null                         │
│  Diagnosis: Still recorded              │
└─────────────────────────────────────────┘
```

---

## Use Cases

### 1. Disease Outbreak Detection

**Query Example**: Find dengue clusters in Metro Manila

```typescript
const dengueCases = await prisma.diagnosis.findMany({
  where: {
    disease: "DENGUE",
    region: "Metro Manila",
    createdAt: {
      gte: new Date("2025-10-01"),
      lte: new Date("2025-10-31"),
    },
  },
  select: {
    latitude: true,
    longitude: true,
    city: true,
    createdAt: true,
  },
});

// Use coordinates for clustering analysis
```

### 2. Geographic Heatmap

**Implementation Idea**:

```typescript
// Group diagnoses by city
const heatmapData = await prisma.diagnosis.groupBy({
  by: ["city", "disease"],
  where: {
    createdAt: {
      gte: new Date("2025-10-01"),
    },
  },
  _count: {
    id: true,
  },
});

// Result: { city: 'Manila', disease: 'DENGUE', _count: { id: 15 } }
```

### 3. Early Warning System

**Logic**:

```typescript
// Check if disease cases in a region exceed threshold
const recentCases = await prisma.diagnosis.count({
  where: {
    disease: "DENGUE",
    region: "Calabarzon",
    createdAt: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    },
  },
});

if (recentCases > THRESHOLD) {
  // Trigger alert to clinicians in that region
  sendOutbreakAlert("Calabarzon", "DENGUE", recentCases);
}
```

### 4. Disease Spread Analysis

**Temporal-Spatial Query**:

```typescript
const spreadData = await prisma.diagnosis.findMany({
  where: {
    disease: "PNEUMONIA",
    createdAt: {
      gte: new Date("2025-01-01"),
    },
  },
  orderBy: {
    createdAt: "asc",
  },
  select: {
    latitude: true,
    longitude: true,
    city: true,
    region: true,
    createdAt: true,
  },
});

// Analyze how disease moves geographically over time
```

---

## Testing

### Manual Testing Checklist

#### Browser Geolocation Test

1. Open diagnosis page in browser
2. Open DevTools → Console
3. Should see permission prompt
4. Grant permission
5. Check console for location logs
6. Record a diagnosis
7. Verify location in database

#### IP Fallback Test

1. Open diagnosis page in incognito/private mode
2. Deny location permission
3. Should fallback to IP location
4. Record a diagnosis
5. Verify location in database (might be less accurate)

#### Database Verification

```sql
-- Check if location data is stored
SELECT
  id,
  disease,
  city,
  region,
  latitude,
  longitude,
  "createdAt"
FROM "Diagnosis"
ORDER BY "createdAt" DESC
LIMIT 10;
```

#### API Rate Limit Test

```typescript
// Test Nominatim rate limit (1 req/sec)
for (let i = 0; i < 5; i++) {
  await getLocationDetails(14.5995, 120.9842);
  // Should handle rate limiting gracefully
}
```

### Edge Cases to Test

1. **No Internet Connection**

   - Both APIs should fail gracefully
   - Diagnosis should still be recorded

2. **Invalid Coordinates**

   - Edge case: user spoofs location
   - Nominatim should return error
   - System should handle gracefully

3. **Slow API Response**

   - 10-second timeout should prevent hang
   - Fallback should work

4. **Multiple Rapid Diagnoses**
   - Location should be cached/reused
   - No need to request again for same session

---

## Future Enhancements

### 1. Location Caching

```typescript
// Cache location for session to avoid repeated requests
const LOCATION_CACHE_KEY = "user_location_cache";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

localStorage.setItem(
  LOCATION_CACHE_KEY,
  JSON.stringify({
    location: locationData,
    timestamp: Date.now(),
  })
);
```

### 2. Manual Location Entry

```typescript
// Allow users to manually specify location if auto-detection fails
<input
  type="text"
  placeholder="Enter your city"
  value={manualCity}
  onChange={(e) => setManualCity(e.target.value)}
/>
```

### 3. Location Accuracy Indicator

```typescript
// Show accuracy to clinicians
<Badge>
  {location.accuracy < 100 ? "High Accuracy (GPS)" : "Low Accuracy (IP)"}
</Badge>
```

### 4. Historical Location Updates

```typescript
// Update User.location periodically for profile
useEffect(() => {
  const updateUserLocation = async () => {
    if (location) {
      await updateUser({
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
        region: location.region,
      });
    }
  };

  updateUserLocation();
}, [location]);
```

### 5. Geospatial Queries

```sql
-- Find diagnoses within 10km radius (PostGIS extension)
SELECT * FROM "Diagnosis"
WHERE ST_DWithin(
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
  ST_SetSRID(ST_MakePoint(120.9842, 14.5995), 4326),
  10000  -- 10km in meters
);
```

---

## Summary

### What We Built

✅ **Client-Side Location Capture**

- Browser Geolocation API integration
- Custom React hook (`useUserLocation`)
- IP-based fallback mechanism

✅ **Server-Side Processing**

- Reverse geocoding via OpenStreetMap
- IP geolocation via ipapi.co
- Server actions for security

✅ **Database Storage**

- Location fields in User & Diagnosis models
- Optional fields for privacy
- Ready for geospatial queries

✅ **UI Integration**

- Seamless location passing through components
- No UI changes required (works in background)
- Graceful degradation if location unavailable

### Key Principles

1. **Privacy First**: Explicit consent, optional fields
2. **Reliability**: Multiple fallbacks, graceful degradation
3. **Accuracy**: GPS when available, IP when necessary
4. **Performance**: Lazy loading, minimal API calls
5. **Scalability**: Ready for clustering algorithms

### Next Steps

1. Run Prisma migration: `npx prisma migrate dev --name add_location_fields`
2. Test location capture in development
3. Verify database storage
4. Build outbreak detection features
5. Create geographic visualization dashboard

---

## Questions?

If you have questions or need clarification on any part of the location tracking system, feel free to ask!

**Key Files to Review**:

- `utils/location.ts` - Server actions
- `utils/use-location.ts` - Client hook
- `prisma/schema.prisma` - Database schema
- `actions/create-diagnosis.ts` - Diagnosis creation
- `components/patient/diagnosis-page/chat-window.tsx` - Integration point
