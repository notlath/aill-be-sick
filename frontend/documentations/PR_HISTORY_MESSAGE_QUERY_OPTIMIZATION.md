# What does this PR do?

Optimizes the `/history` page by reducing the amount of data fetched from the database. Previously, the `getChats` utility fetched **every** `Message` row for every `Chat` belonging to the user (`messages: true`), even though messages are only used as a fallback display — and even then, only the content of the single most recent message is shown (truncated to 120 characters). This change makes the query fetch only what is actually rendered.

## Changes

### 1. `frontend/utils/chat.ts` (line 6)

**Widened the `messages` parameter type** from `boolean` to `boolean | object`.

This allows callers to pass a Prisma relation sub-query object (e.g. `{ take: 1, orderBy: ... }`) instead of just `true`/`false`. The change is consistent with the existing `tempDiagnoses` parameter, which already accepted `boolean | object`.

```diff
- export const getChats = async (userId: number, include?: { messages?: boolean; diagnosis?: boolean; tempDiagnoses?: boolean | object }) => {
+ export const getChats = async (userId: number, include?: { messages?: boolean | object; diagnosis?: boolean; tempDiagnoses?: boolean | object }) => {
```

No other changes to this file. The `"use cache"` directive, `cacheLife("hours")`, `cacheTag`, and the Prisma `findMany` query structure are all untouched.

### 2. `frontend/app/(app)/(patient)/history/page.tsx`

Two targeted changes within the `ChatHistoryList` server component:

#### a. `getChats` call site (lines 16-22)

**Replaced `messages: true` with `{ take: 1, orderBy: { createdAt: "desc" } }`.**

Prisma now generates a correlated subquery (`ORDER BY "createdAt" DESC LIMIT 1`) per chat, returning at most one message row — the most recent — instead of the entire message history.

```diff
- // Include messages, diagnosis, and tempDiagnoses to avoid N+1 queries
- // tempDiagnoses doesn't order by createdAt automatically in include, so we sort it below
+ // Include only the latest message (for fallback display), diagnosis, and tempDiagnoses
+ // to avoid fetching every Message row. tempDiagnoses doesn't order by createdAt
+ // automatically in include, so we sort it below.
  const { success: chats, error } = await getChats(dbUser.id, {
-   messages: true,
+   messages: { take: 1, orderBy: { createdAt: "desc" } },
    diagnosis: true,
    tempDiagnoses: true,
  });
```

#### b. Fallback message logic (lines 63-73)

**Removed the client-side array copy and sort.** Previously, the code spread all messages into a new array, sorted them by `createdAt` descending in JavaScript, and picked the first element — all to get a single string. Since the query now guarantees the array contains at most one element (already the most recent), this is replaced with a direct optional-chain accessor.

```diff
  } else {
-   const messages = chat.messages || [];
-   const latestMessageContentRaw =
-     messages.length > 0
-       ? [...messages].sort(
-           (a, b) =>
-             new Date(b.createdAt).getTime() -
-             new Date(a.createdAt).getTime(),
-         )[0].content
-       : "";
+   // Only the latest message is fetched (take: 1, orderBy desc) — no sort needed
+   const latestMessageContentRaw = chat.messages?.[0]?.content ?? "";

    diagnosis =
      latestMessageContentRaw.length > 120
        ? `${latestMessageContentRaw.slice(0, 120)}...`
        : latestMessageContentRaw;
  }
```

## What was NOT changed

| Component | Status | Reason |
|---|---|---|
| `"use cache"` / `cacheLife("hours")` / `cacheTag` in `getChats` | Untouched | Caching strategy is unchanged |
| `revalidatePath("/history")` in `create-chat.ts`, `delete-chat.ts`, `create-diagnosis.ts`, `auto-record-diagnosis.ts` | Untouched | Cache invalidation paths are unchanged |
| `HistoryRow` type in `columns.tsx` | Untouched | Receives already-processed strings, never raw messages |
| `DataTable` component | Untouched | Client-side pagination, sorting, filtering all operate on `HistoryRow[]` |
| `ChatHistorySkeleton` | Untouched | Pure presentational, no data dependency |
| Prisma schema / `Message` model | Untouched | No schema changes needed |

# Testing Done:

- [ ] Load `/history` as an authenticated patient. Verify all rows render correctly with diagnosis name, confidence, uncertainty, model badge, and date.
- [ ] Verify the **fallback case**: find or create a chat that has no confirmed `Diagnosis` and no `TempDiagnosis` records. Confirm the history row shows the truncated content of its most recent message (up to 120 characters with ellipsis).
- [ ] Verify the **empty state**: a new user with no chats sees the "You don't have any diagnosis history yet." message.
- [ ] Verify **sorting** (all 8 sort options), **disease filter dropdown**, and **global search** in the data table still function correctly.
- [ ] Verify **pagination** (page size changes, First/Previous/Next/Last buttons, row count display).
- [ ] Verify the **Export PDF** button produces a correct download with all rows.
- [ ] Verify that **creating a new diagnosis**, **deleting a chat**, or **completing a follow-up session** invalidates the cache and the history page reflects updated data on next load.

# Additional Notes:

- **No schema migration needed.** The `Message` model's existing `@@index([createdAt])` means the `ORDER BY createdAt DESC LIMIT 1` subquery Prisma generates is index-backed.
- **Net line reduction.** The fallback branch goes from 10 lines to 2, removing an array spread, a sort comparator with `Date` constructor calls, and a conditional ternary — all of which existed only to pick `[0].content` from an unbounded array.
- **Backward compatible.** `getChats` still accepts `messages: true` from any other caller. The type was widened (`boolean` to `boolean | object`), not changed.
