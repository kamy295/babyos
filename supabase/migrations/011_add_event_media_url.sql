BEGIN;

ALTER TABLE public.baby_events
ADD COLUMN media_url TEXT;

CREATE OR REPLACE FUNCTION public.confirm_family_capture(
  p_family_id UUID,
  p_baby_id UUID,
  p_content TEXT,
  p_events JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_note public.family_notes%ROWTYPE;
  v_event JSONB;
  v_saved_event public.baby_events%ROWTYPE;
  v_events JSONB := '[]'::JSONB;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Note content cannot be empty';
  END IF;

  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' THEN
    RAISE EXCEPTION 'Events must be a JSON array';
  END IF;

  IF jsonb_array_length(p_events) < 1 OR jsonb_array_length(p_events) > 20 THEN
    RAISE EXCEPTION 'Expected between 1 and 20 events';
  END IF;

  INSERT INTO public.family_notes (family_id, baby_id, content)
  VALUES (p_family_id, p_baby_id, trim(p_content))
  RETURNING * INTO v_note;

  FOR v_event IN SELECT value FROM jsonb_array_elements(p_events)
  LOOP
    INSERT INTO public.baby_events (
      family_id,
      baby_id,
      source_note_id,
      content,
      category,
      event_date,
      start_time,
      end_time,
      quantity,
      unit,
      duration_minutes,
      media_url
    )
    VALUES (
      p_family_id,
      p_baby_id,
      v_note.id,
      trim(v_event->>'content'),
      v_event->>'category',
      nullif(v_event->>'eventDate', '')::date,
      nullif(v_event->>'startTime', '')::time,
      nullif(v_event->>'endTime', '')::time,
      nullif(v_event->>'quantity', '')::numeric,
      nullif(v_event->>'unit', ''),
      nullif(v_event->>'durationMinutes', '')::integer,
      nullif(v_event->>'mediaUrl', '')
    )
    RETURNING * INTO v_saved_event;

    v_events := v_events || jsonb_build_array(to_jsonb(v_saved_event));
  END LOOP;

  RETURN jsonb_build_object(
    'note', to_jsonb(v_note),
    'events', v_events
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_family_capture(UUID, UUID, TEXT, JSONB)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_family_capture(UUID, UUID, TEXT, JSONB)
TO service_role;

COMMIT;
