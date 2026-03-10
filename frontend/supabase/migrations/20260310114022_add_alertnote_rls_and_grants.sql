-- Grant SELECT on AlertNote table to authenticated users
GRANT SELECT ON TABLE public."AlertNote" TO authenticated;

-- Enable Row Level Security on AlertNote table
ALTER TABLE public."AlertNote" ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read all alert notes
CREATE POLICY "authenticated users can read alert notes"
  ON public."AlertNote"
  FOR SELECT
  TO authenticated
  USING (true);

-- Add AlertNote to Realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public."AlertNote";
