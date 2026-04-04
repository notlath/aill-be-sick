-- Grant service_role schema and table permissions for Edge Function access.
-- Required for the surveillance-cron Edge Function to create/update Alert records.
-- This is needed because Prisma-managed tables may not have service_role grants by default.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Explicit grants for the Alert table (belt-and-suspenders)
GRANT INSERT, SELECT, UPDATE ON TABLE public."Alert" TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Explicit grants for the AlertNote table
GRANT INSERT, SELECT, UPDATE ON TABLE public."AlertNote" TO service_role;
