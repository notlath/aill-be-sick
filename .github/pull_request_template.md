## Summary

- What changed
- Why this change was needed

## User Impact

- What users/clinicians/admins will notice
- Any behavior changes they should expect

## Scope

- In scope:
- Out of scope:

## Linked Work

- Closes/Fixes:
- Related:

## Files Changed

- Frontend:
- Backend:
- Database/Prisma:
- Docs:

## Testing Done

- Commands run:
- Scenarios validated:
- Result:

## Risks & Rollback

- Risks:
- Rollback plan:

## Screenshots (if UI changes)

- Before:
- After:

## AI Checklist

- [ ] Architecture references are accurate (Flask backend on port 10000)
- [ ] Frontend mutation changes use Zod schema + `next-safe-action`
- [ ] Cache revalidation added where mutation behavior affects UI state
- [ ] Backend/Frontend contracts are unchanged or documented
- [ ] Migration or seed steps are documented if schema/data shape changed
- [ ] No secrets or sensitive data were introduced
- [ ] User-facing medical copy avoids absolute diagnosis claims
- [ ] User-facing text avoids the word "cluster" and uses "group" where applicable
