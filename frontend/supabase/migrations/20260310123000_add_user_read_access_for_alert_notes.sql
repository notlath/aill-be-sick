-- Grant SELECT on User table to authenticated users
-- This is required for the AlertNote query to join with User and fetch author names
GRANT SELECT ON TABLE public."User" TO authenticated;

-- Enable Row Level Security on User table
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read user profiles (needed for alert note author names)
CREATE POLICY "authenticated users can read user profiles"
  ON public."User"
  FOR SELECT
  TO authenticated
  USING (true);
