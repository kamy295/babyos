CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_sleep_per_baby
ON public.baby_events (baby_id)
WHERE category = 'Sleep'
  AND end_time IS NULL;