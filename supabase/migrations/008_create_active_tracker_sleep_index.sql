-- pg-delta: transaction=false
-- Run this standalone stage with a Supabase migration runner that honors the
-- transaction=false directive. Do not wrap CREATE INDEX CONCURRENTLY in BEGIN.
-- If the concurrent build fails, inspect and remove any invalid index with
-- DROP INDEX CONCURRENTLY before retrying; keep migration 009 unapplied.
CREATE UNIQUE INDEX CONCURRENTLY idx_one_active_tracker_sleep_per_baby
ON public.baby_events (baby_id)
WHERE category = 'Sleep'
  AND is_tracker_session = TRUE
  AND end_time IS NULL;
