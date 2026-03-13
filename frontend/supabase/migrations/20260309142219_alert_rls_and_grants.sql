-- Grant schema usage to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT on Alert table to authenticated users
GRANT SELECT ON TABLE public."Alert" TO authenticated;

-- Enable Row Level Security on Alert table
ALTER TABLE public."Alert" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read all alerts
CREATE POLICY "authenticated users can read alerts"
  ON public."Alert"
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable Realtime for the Alert table.
-- ALTER PUBLICATION is idempotent-safe: adding a table that is already in the
-- publication is a no-op on Supabase managed instances.
ALTER PUBLICATION supabase_realtime ADD TABLE public."Alert";
