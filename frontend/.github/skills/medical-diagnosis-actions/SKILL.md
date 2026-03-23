---
name: medical-diagnosis-actions
description: Implement frontend diagnosis and mutation workflows using the repository’s `next-safe-action` + Zod + Prisma patterns. Use this skill for creating or updating server actions in `frontend/actions`, including diagnosis flow, follow-up questions, alerts, and profile/account mutations.
---

# Medical Diagnosis Actions

## Scope

Use this skill when changing mutation behavior in the frontend Next.js app:

- `frontend/actions/*.ts`
- `frontend/schemas/*.ts`
- cache revalidation logic after writes
- diagnosis request/response handling and user-safe error messaging

## Canonical patterns

- Action client source: `frontend/actions/client.ts`
- Diagnosis action reference: `frontend/actions/run-diagnosis.ts`
- Schema folder: `frontend/schemas/`
- Backend URL resolver: `frontend/utils/backend-url.ts`

## Required implementation pattern

1. Put or update a Zod schema in `frontend/schemas`.
2. Define action with:
   - `"use server"`
   - `actionClient.inputSchema(Schema).action(async ({ parsedInput }) => { ... })`
3. Handle expected failures with structured return objects (do not rely on unhandled throws).
4. Revalidate affected paths/tags after successful mutations.
5. Keep user-facing medical text plain-language and non-absolute.

## Guardrails

- Do not bypass schema validation for mutation input.
- Do not hardcode backend base URLs in actions.
- Do not return certainty language for diagnosis copy.
- Do not use the word "cluster" in user-facing text; use "group".

## Validation

Run frontend checks for touched flows:

- `npx tsc --noEmit`
- Optional broader validation: `npm run build`

## Output expectations

When implementing with this skill, provide:

- modified files
- why each change was necessary
- validation results
