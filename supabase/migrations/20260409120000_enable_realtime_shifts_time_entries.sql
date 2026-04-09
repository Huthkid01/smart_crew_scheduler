-- Live updates via Supabase Realtime (postgres_changes). RLS still applies to delivered events.
-- FULL replica identity helps filtered subscriptions and UPDATE payloads.
-- Safe to re-run: publication ADD TABLE ignores if already a member.

ALTER TABLE public.time_entries REPLICA IDENTITY FULL;
ALTER TABLE public.shifts REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
