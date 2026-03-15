# fix: Harden backend and frontend against 5 urgent security vulnerabilities

## What does this PR do?

Addresses 5 urgent security vulnerabilities identified during a comprehensive cybersecurity audit of the codebase. These issues range from CRITICAL (remote code execution) to HIGH (privilege escalation, information disclosure, session hijacking, CORS misconfiguration) and must be resolved before the next production deploy.

### Fix #1 — Flask debug mode defaults to `True` (CRITICAL)

**File:** `backend/run.py`

**Problem:** The `FLASK_DEBUG` environment variable defaulted to `"True"` when unset. In production, if the variable is not explicitly configured, the Werkzeug interactive debugger is enabled — allowing **remote code execution** by anyone who can trigger a 500 error and interact with the debugger console.

**Fix:** Changed the default from `"True"` to `"False"`:

```python
# Before
debug = os.getenv("FLASK_DEBUG", "True").lower() in ("1", "true", "yes")

# After
debug = os.getenv("FLASK_DEBUG", "False").lower() in ("1", "true", "yes")
```

---

### Fix #2 — `adminSignup` server action has no authorization guard (HIGH)

**File:** `frontend/actions/admin-auth.ts`

**Problem:** The `adminSignup` action had zero authentication or authorization checks. Any unauthenticated HTTP client could call this action to create a new user with the `ADMIN` role, gaining full administrative access to the system (managing clinicians, viewing all patient data, etc.).

**Fix:** Added a `getCurrentDbUser()` check at the top of the action, following the established pattern from `manage-clinicians.ts`. The caller must now be an authenticated user with `ADMIN` or `DEVELOPER` role:

```typescript
const { success: dbUser, error: authError } = await getCurrentDbUser();

if (authError || !dbUser) {
  return { error: "Unauthorized" };
}

if (dbUser.role !== "ADMIN" && dbUser.role !== ("DEVELOPER" as any)) {
  return { error: "Unauthorized. Admin access required." };
}
```

---

### Fix #3 — Stack traces leaked in API error responses (HIGH)

**Files:** `backend/app/api/cluster.py`, `backend/app/api/surveillance.py`, `backend/app/api/outbreak.py`

**Problem:** Six exception handlers across three blueprint files unconditionally included `traceback.format_exc()` in JSON error responses via a `"details"` field. This exposes internal file paths, Python/library versions, database query structures, and other sensitive implementation details to any API consumer — even in production.

The `diagnosis.py` blueprint already correctly gated this behind `current_app.debug`. The other blueprints did not follow this pattern.

**Fix:** Applied the same `current_app.debug` gate used in `diagnosis.py` to all 6 exception handlers:

- `cluster.py`: 4 handlers (`patient_clusters`, `patient_clusters_silhouette`, `illness_clusters`, `illness_clusters_silhouette`)
- `surveillance.py`: 1 handler (`surveillance_outbreaks`)
- `outbreak.py`: 1 handler (`detect`) — also added `traceback` import and server-side `print()` logging that was previously missing

```python
# Before (cluster.py, surveillance.py)
return jsonify({"error": str(e), "details": error_details}), 500

# After (all three files)
payload = {"error": str(e)}
if current_app.debug:
    payload["details"] = error_details
return jsonify(payload), 500
```

Stack traces are still logged server-side via `print()` for debugging. They are only suppressed from the HTTP response in non-debug mode.

---

### Fix #4 — CORS wildcard fallback and HTTP origin (HIGH)

**File:** `backend/app/__init__.py`

**Problem:** Two issues in the CORS configuration:

1. `os.getenv("FRONTEND_URL", "*")` falls back to a **wildcard origin** (`*`) when the environment variable is unset. Combined with `supports_credentials=True`, this is a dangerous misconfiguration — browsers will reject it per the CORS spec, but misconfigured proxies or non-browser clients could exploit the permissive intent.
2. The Vercel production origin was `"http://aill-be-sick.vercel.app/"` — using **HTTP** (not HTTPS) and including a **trailing slash** (invalid in CORS origin matching).

**Fix:**
- Removed the `"*"` wildcard default. `FRONTEND_URL` is now included only when explicitly set, filtered through `filter(None, ...)`.
- Fixed the Vercel origin to `"https://aill-be-sick.vercel.app"` (HTTPS, no trailing slash).

```python
# Before
origins=[
    "http://localhost:3000",
    "http://aill-be-sick.vercel.app/",
    os.getenv("FRONTEND_URL", "*"),
],

# After
allowed_origins = list(filter(None, [
    "http://localhost:3000",
    "https://aill-be-sick.vercel.app",
    os.getenv("FRONTEND_URL"),
]))
CORS(flask_app, origins=allowed_origins, supports_credentials=True)
```

---

### Fix #5 — Flask session secret key regenerated on every restart (HIGH)

**File:** `backend/app/__init__.py`

**Problem:** `flask_app.secret_key = secrets.token_hex(32)` generates a new random key every time the app starts. This means:
- All existing user sessions are invalidated on every deploy or restart.
- Horizontal scaling across multiple instances is broken (each instance gets a different key, so sessions from one instance are invalid on another).

**Fix:** The secret key is now read from the `FLASK_SECRET_KEY` environment variable, with a random fallback for local development. A `logging.warning()` is emitted when the env var is missing so developers are alerted to set it in production:

```python
flask_app.secret_key = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)
if not os.environ.get("FLASK_SECRET_KEY"):
    logging.warning(
        "FLASK_SECRET_KEY is not set — using a random key. "
        "Sessions will not persist across restarts. "
        "Set FLASK_SECRET_KEY in your environment for production."
    )
```

---

## Files Changed

| File | Change Summary |
|---|---|
| `backend/run.py` | Changed `FLASK_DEBUG` default from `"True"` to `"False"` |
| `frontend/actions/admin-auth.ts` | Added `getCurrentDbUser()` auth guard to `adminSignup` |
| `backend/app/api/cluster.py` | Gated `details` behind `current_app.debug` in 4 exception handlers |
| `backend/app/api/surveillance.py` | Gated `details` behind `current_app.debug` in 1 exception handler |
| `backend/app/api/outbreak.py` | Gated `details` behind `current_app.debug` in 1 exception handler; added `traceback` import and server-side logging |
| `backend/app/__init__.py` | Fixed CORS origins (HTTPS, no wildcard fallback); session secret key from env var with warning |

## Testing Done

- **Fix #1 (debug mode):** Verified `run.py` defaults to `debug=False` when `FLASK_DEBUG` is unset. Setting `FLASK_DEBUG=True` still enables debug mode for local development.
- **Fix #2 (admin auth):** The `adminSignup` action now calls `getCurrentDbUser()` and checks for `ADMIN`/`DEVELOPER` role before proceeding. Unauthenticated or non-admin callers receive `{ error: "Unauthorized" }`.
- **Fix #3 (stack traces):** Confirmed all 6 exception handlers across `cluster.py`, `surveillance.py`, and `outbreak.py` only include `"details"` in the response when `current_app.debug` is `True`. Used `rg -B1 'payload\["details"\]'` to verify every assignment is behind a `current_app.debug` check. Stack traces still print server-side for debugging.
- **Fix #4 (CORS):** Verified the origins list contains `"https://aill-be-sick.vercel.app"` (HTTPS, no trailing slash), `"http://localhost:3000"`, and optionally `FRONTEND_URL` when set. No wildcard fallback exists.
- **Fix #5 (secret key):** Verified `FLASK_SECRET_KEY` env var is read first, with `secrets.token_hex(32)` as fallback. Warning log is emitted when the env var is absent.

## Additional Notes

- **No new dependencies** were introduced. The `logging` module added to `__init__.py` is part of the Python standard library.
- **No behavioral changes** for existing functionality. All fixes are purely security hardening.
- **Production deployment requirement:** After merging, the following environment variables should be set in production:
  - `FLASK_SECRET_KEY` — a stable, random hex string (e.g., `python -c "import secrets; print(secrets.token_hex(32))"`)
  - `FLASK_DEBUG` — should be unset or `"False"` (now defaults correctly)
  - `FRONTEND_URL` — should be set to the production frontend URL if different from the Vercel default
- The `diagnosis.py` blueprint was already following the correct `current_app.debug` pattern and required no changes. It served as the reference implementation for Fix #3.
- The auth guard pattern in Fix #2 mirrors the existing pattern in `manage-clinicians.ts` (lines 14–22) exactly, including the `("DEVELOPER" as any)` cast used throughout the codebase for the informal developer role.
