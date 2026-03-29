/**
 * Supabase Admin Client
 * 
 * This client uses the SUPABASE_SERVICE_ROLE_KEY to perform admin operations
 * such as creating users on behalf of clinicians. This key bypasses Row Level
 * Security and should ONLY be used in server-side code.
 * 
 * NEVER import this file in client components or expose the service role key.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

/**
 * Server-only Supabase client with admin privileges.
 * Use this for operations that require bypassing RLS, such as:
 * - Creating users on behalf of clinicians (auth.admin.createUser)
 * - Administrative user management
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
