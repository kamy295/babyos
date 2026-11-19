
create or replace function public.confirm_family_capture(
  p_family_id uuid,
  p_baby_id uuid,
  p_content text,
  p_events jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_note public.family_notes%rowtype;
  v_event jsonb;
  v_saved_event public.baby_events%rowtype;
  v_events jsonb := '[]'::jsonb;
begin
  -- Validate the original note.
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'Note content cannot be empty';
  end if;

  -- Validate the event collection.
  if p_events is null
     or jsonb_typeof(p_events) <> 'array'
     or jsonb_array_length(p_events) < 1
     or jsonb_array_length(p_events) > 20 then
    raise exception 'Expected between 1 and 20 events';
  end if;

  -- Save the original note.
  insert into public.family_notes (
    family_id,
    baby_id,
    content
  )
  values (
    p_family_id,
    p_baby_id,
    trim(p_content)
  )
  returning * into v_note;

  -- Save each reviewed event, linked to the original note.
  for v_event in
    select value from jsonb_array_elements(p_events)
  loop
    insert into public.baby_events (
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
      duration_minutes
    )
    values (
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
      nullif(v_event->>'durationMinutes', '')::integer
    )
    returning * into v_saved_event;

    v_events := v_events || jsonb_build_array(to_jsonb(v_saved_event));
  end loop;

  return jsonb_build_object(
    'note', to_jsonb(v_note),
    'events', v_events
  );
end;
$$;

-- Only the backend service role should execute this function.
revoke all on function public.confirm_family_capture(uuid, uuid, text, jsonb)
from public, anon, authenticated;

grant execute on function public.confirm_family_capture(uuid, uuid, text, jsonb)
to service_role;
