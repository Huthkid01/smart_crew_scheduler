-- Live updates via Supabase Realtime (postgres_changes). RLS still applies to delivered events.
-- FULL replica identity helps filtered subscriptions and UPDATE payloads.
ALTER TABLE public.time_entries REPLICA IDENTITY FULL;
ALTER TABLE public.shifts REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
