# Supabase OAuth PKCE Fix - Debugging Guide

## Problem

You're getting this error:

```
Error [AuthApiError]: invalid request: both auth code and code verifier should be non-empty
```

This happens because Supabase's PKCE (Proof Key for Code Exchange) security flow requires both:

1. **Authorization code** - returned by Google after user consent
2. **Code verifier** - stored on the client side during OAuth initiation

## Root Causes

### 1. **Missing or Mismatched Redirect URLs in Supabase**

The most common cause. Your Supabase OAuth redirect URL doesn't match what your app is sending.

**Fix:**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to: Authentication → Providers → Google
3. Look at the "Redirect URL" setting
4. Ensure it exactly matches your callback route

**Expected formats:**

- Local: `http://localhost:3000/auth/callback`
- Production: `https://yourdomain.com/auth/callback`

### 2. **Missing Environment Variables**

Your app can't connect to Supabase without these.

**Check your `frontend/.env.local` file has:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

To find these:

1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy `Project URL` and `anon` key

### 3. **Cookies Not Being Preserved**

The code verifier is stored in a cookie, but it's not being sent to the callback route.

**This is now fixed in your updated code** - the callback route properly uses the Supabase server client which automatically retrieves cookies.

### 4. **Browser Storage Issues**

Session storage might be cleared between OAuth redirect.

**Solution:** Modern browsers preserve cookies across redirects. If you're seeing issues:

- Clear browser cache/cookies
- Try a different browser
- Check browser console for any storage-related errors

## Verification Checklist

### Step 1: Verify Supabase Configuration

```bash
# Check your environment variables are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Step 2: Check Redirect URL in Supabase

1. Supabase Dashboard → Authentication → Providers → Google
2. Verify redirect URL matches exactly:
   - For local dev: `http://localhost:3000/auth/callback`
   - For production: Check your actual domain

### Step 3: Test with Debugging Enabled

The updated callback route now includes detailed logging:

```
[OAuth Callback] Incoming cookies: [list of cookies]
[OAuth Callback] Attempting to exchange code for session...
[OAuth Callback] Code exchange successful
[OAuth Callback] User authenticated: user_id_here
```

Check your Next.js server logs for these messages during OAuth flow.

### Step 4: Browser DevTools Checks

1. Open DevTools → Application → Cookies
2. After clicking "Sign in with Google", you should see a cookie like:
   - `sb-<project_id>-auth-token`
3. Check if the cookie is preserved after redirect

## Fixes Applied

### 1. Enhanced Callback Route (`/app/auth/callback/route.ts`)

- ✅ Better error handling with detailed error messages
- ✅ Logging of incoming cookies for debugging
- ✅ Explicit PKCE verification
- ✅ Better error reporting to users

### 2. Improved Login Page (`/app/(auth)/login/page.tsx`)

- ✅ Added OAuth flow comments
- ✅ Proper error handling
- ✅ Explicit PKCE options

### 3. Error Page (`/app/auth/auth-code-error/page.tsx`)

- ✅ User-friendly error messages
- ✅ Shows technical error details for debugging
- ✅ Options to retry or go home

### 4. Server Client (`/utils/supabase/server.ts`)

- ✅ Improved cookie handling comments

## Next Steps

1. **Clear browser cache and cookies:**
   - Go to DevTools → Application → Clear site data
   - Or use Shift + Cmd + Delete (macOS) / Ctrl + Shift + Delete (Windows)

2. **Restart the Next.js development server:**

   ```bash
   npm run dev  # or your start command
   ```

3. **Test the OAuth flow:**
   - Click "Sign in with Google"
   - Watch the console logs in your terminal
   - You should see the `[OAuth Callback]` logs

4. **If still failing:**
   - Check the error page that appears
   - Copy the error code/message
   - Verify Supabase redirect URL again
   - Check `.env.local` is being read (restart dev server if you just added it)

## Common Error Messages

### "validation_failed" / "both auth code and code verifier should be non-empty"

- **Cause:** Code verifier not found in cookies
- **Fix:**
  1. Verify redirect URL in Supabase matches exactly
  2. Clear browser cookies
  3. Restart dev server
  4. Try signing in again

### "Invalid OAuth request"

- **Cause:** Google OAuth app not properly configured
- **Fix:**
  1. Check Google OAuth credentials in Supabase
  2. Verify redirect URI in Google Cloud Console
  3. Ensure OAuth app is approved (if in development)

### "User not found" or similar

- **Cause:** User created in Supabase but database upsert failed
- **Fix:**
  1. Check your database connection
  2. Verify `DATABASE_URL` in `.env.local`
  3. Check Prisma schema is correct

## Testing with curl (Advanced)

If you want to test the OAuth flow manually:

```bash
# Get the authorization URL
curl "https://your-project.supabase.co/auth/v1/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:3000/auth/callback&scope=openid+profile+email"

# This will redirect you to Google login
# After login, you'll get a code parameter in the callback URL
# Then test:
curl -X POST "https://your-project.supabase.co/auth/v1/token?grant_type=authorization_code&code=CODE_HERE&client_id=YOUR_CLIENT_ID&code_verifier=VERIFIER_HERE"
```

## Additional Resources

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [PKCE Explanation](https://datatracker.ietf.org/doc/html/rfc7636)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

## Still Having Issues?

1. Check your `.env.local` is in the root of the `frontend/` folder
2. Verify you restarted the dev server after changing `.env.local`
3. Clear browser cache completely
4. Try in an incognito window
5. Check Supabase dashboard for any error logs
6. Review the detailed logs in your Next.js terminal output
