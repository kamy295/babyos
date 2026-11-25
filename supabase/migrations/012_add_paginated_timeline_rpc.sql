BEGIN;

CREATE OR REPLACE FUNCTION public.get_baby_events_page(
  p_family_id UUID,
  p_baby_id UUID,
  p_page BIGINT,
  p_page_size INTEGER,
  p_category TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_offset BIGINT;
BEGIN
  IF p_page IS NULL OR p_page < 1 THEN
    RAISE EXCEPTION 'Page must be a positive integer';
  END IF;

  IF p_page_size IS NULL OR p_page_size < 1 THEN
    RAISE EXCEPTION 'Page size must be a positive integer';
  END IF;

  IF p_page_size > 100 THEN
    RAISE EXCEPTION 'Page size cannot exceed 100';
  END IF;

  IF p_page - 1 > 1000000::BIGINT / p_page_size THEN
    RAISE EXCEPTION 'Requested offset cannot exceed 1000000 rows';
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  WITH filtered_events AS MATERIALIZED (
    SELECT
      event.id,
      event.source_note_id,
      event.is_tracker_session,
      event.content,
      event.category,
      event.event_date,
      event.end_date,
      event.start_time,
      event.end_time,
      event.quantity,
      event.unit,
      event.duration_minutes,
      event.media_url,
      event.recorded_at,
      event.created_at,
      COALESCE(
        event.event_date,
        (event.created_at AT TIME ZONE 'Asia/Kolkata')::DATE
      ) AS effective_date
    FROM public.baby_events AS event
    WHERE event.family_id = p_family_id
      AND event.baby_id = p_baby_id
      AND (p_category IS NULL OR p_category = 'All' OR event.category = p_category)
  ),
  page_events AS (
    SELECT *
    FROM filtered_events
    ORDER BY
      effective_date DESC,
      start_time DESC NULLS LAST,
      created_at DESC,
      id DESC
    LIMIT p_page_size
    OFFSET v_offset
  )
  SELECT jsonb_build_object(
    'events', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(page_event) - 'effective_date'
          ORDER BY
            page_event.effective_date DESC,
            page_event.start_time DESC NULLS LAST,
            page_event.created_at DESC,
            page_event.id DESC
        )
        FROM page_events AS page_event
      ),
      '[]'::JSONB
    ),
    'totalRecords', (SELECT COUNT(*) FROM filtered_events)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_baby_events_page(UUID, UUID, BIGINT, INTEGER, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_baby_events_page(UUID, UUID, BIGINT, INTEGER, TEXT)
TO service_role;

-- Staging verification for mixed dated and undated records:
-- Compare the event IDs returned by this RPC with this reference ordering:
-- SELECT id FROM public.baby_events
-- WHERE family_id = '<family UUID>' AND baby_id = '<baby UUID>'
-- ORDER BY COALESCE(event_date, (created_at AT TIME ZONE 'Asia/Kolkata')::DATE) DESC,
--          start_time DESC NULLS LAST, created_at DESC, id DESC
-- LIMIT <page size> OFFSET ((<1-based page> - 1) * <page size>);

COMMIT;
