# Caching Pattern (Next.js 16 Cache Components)

This document explains the caching pattern implemented for the Patient Diagnosis module, leveraging Next.js 16's Cache Components and `'use cache'` directives. This pattern optimizes performance by making navigation and chat reloading practically instantaneous.

## Overview

Next.js 16 introduced the `'use cache'` directive (replacing `unstable_cache`). This directive automatically caches the return values of asynchronous functions, generating cache keys automatically based on function closures and arguments.

## 1. Caching API Utilities

We apply `'use cache'` at the function level for our data-fetching utilities in `frontend/utils/`.

### Standard Caching

For standard database queries, we use `'use cache'`, define a cache lifetime with `cacheLife`, and optionally assign a `cacheTag` for targeted invalidation.

```typescript
// frontend/utils/diagnosis.ts
import prisma from "@/prisma/prisma";
import { cacheLife, cacheTag } from "next/cache";

export const getDiagnosisByChatId = async (chatId: string) => {
  "use cache";
  cacheLife("hours"); // Built-in cache profile (retains for hours)
  cacheTag("diagnosis", `diagnosis-${chatId}`); // Tag for granular invalidation

  try {
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { chatId },
    });
    return { success: diagnosis };
  } catch (error) {
    return { error: `Could not fetch diagnosis` };
  }
};
```

### Caching with Runtime APIs (Cookies/Headers)

By default, `'use cache'` cannot be used inside functions that read runtime data like `cookies()` or `headers()`. 
Furthermore, if a utility function explicitly opts into dynamic rendering via Next.js 15+ changes (e.g. using `await connection()`), it will throw an error even if you use `'use cache: private'`. 

Therefore, **always extract the request-time dependency (auth, session check) outside of the cached function**, and pass any required data as arguments to the cached function.

```typescript
// frontend/utils/chat.ts
import { cacheLife, cacheTag } from "next/cache";

// Correct: Pass dynamic values as arguments if needed, 
// rather than fetching them dynamically inside the cached function.
export const getChatById = async (chatId: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag("chat", `chat-${chatId}`);

  // Fetch from DB using arguments, avoiding cookies() or connection() checks inside
  // ... fetch and return chat ...
};
```

## 2. Invalidating the Cache

When data is mutated (e.g., a new message is sent, or a diagnosis is recorded), we must invalidate the cache so the client sees the fresh data immediately. This invalidation happens inside our Next.js Server Actions (`frontend/actions/`).

To purge the cache, we use `revalidatePath` to clear all cached layouts and data for a specific route.

```typescript
// frontend/actions/create-message.ts
"use server";

import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

export const createMessage = actionClient
  .inputSchema(CreateMessageSchema)
  .action(async ({ parsedInput }) => {
    const { content, chatId, type, role, tempDiagnosis } = parsedInput;

    // ... create message in database ...

    // Invalidate the cache for the specific chat page.
    // This tells Next.js to purge the cache for this route, triggering
    // fresh data fetches utilizing the 'use cache' utilities on the next render.
    revalidatePath("/diagnosis/[chatId]", "page");

    return { success: createdMessage };
  });
```

*Note: You can also use `revalidateTag(tag)` if you want to invalidate specific data without purging the entire page cache, but `revalidatePath` is often safer for complex chat interfaces where multiple components need to reflect the most recent state.*

## Summary Checklist for Developers

1. **Add `'use cache'`**: Place at the top of pure async data-fetching functions.
2. **Use `'use cache: private'`**: Only when the function transitively accesses `cookies()` or `headers()` (e.g., verifying auth).
3. **Set `cacheLife`**: Define how long the cache is valid (e.g., `'hours'`, `'days'`).
4. **Set `cacheTag`**: Provide an identifier (e.g., `` `messages-${chatId}` ``) to granularly target this cache.
5. **Invalidate on Mutation**: In your Server Actions, use `revalidatePath(route, "page")` or `revalidateTag(tag)` after successfully writing to the database.
