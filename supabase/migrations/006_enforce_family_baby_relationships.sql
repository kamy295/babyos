-- 1. Add unique keys required by composite foreign keys.

ALTER TABLE public.babies
ADD CONSTRAINT babies_family_id_id_key
UNIQUE (family_id, id);

ALTER TABLE public.family_notes
ADD CONSTRAINT family_notes_family_baby_id_id_key
UNIQUE (family_id, baby_id, id);


-- 2. family_notes must reference a baby belonging to the same family.

ALTER TABLE public.family_notes
DROP CONSTRAINT family_notes_baby_id_fkey;

ALTER TABLE public.family_notes
ADD CONSTRAINT family_notes_family_baby_fkey
FOREIGN KEY (family_id, baby_id)
REFERENCES public.babies (family_id, id)
ON DELETE CASCADE;


-- 3. baby_events must reference a baby belonging to the same family.

ALTER TABLE public.baby_events
DROP CONSTRAINT baby_events_baby_id_fkey;

ALTER TABLE public.baby_events
ADD CONSTRAINT baby_events_family_baby_fkey
FOREIGN KEY (family_id, baby_id)
REFERENCES public.babies (family_id, id)
ON DELETE CASCADE;


-- 4. baby_events.source_note_id must reference a note
-- belonging to the same family and baby.
-- Deleting a note sets only source_note_id to NULL.

ALTER TABLE public.baby_events
DROP CONSTRAINT baby_events_source_note_id_fkey;

ALTER TABLE public.baby_events
ADD CONSTRAINT baby_events_source_note_family_baby_fkey
FOREIGN KEY (family_id, baby_id, source_note_id)
REFERENCES public.family_notes (family_id, baby_id, id)
ON DELETE SET NULL (source_note_id);


-- 5. tasks must reference a baby belonging to the same family.
-- Deleting a baby sets only baby_id to NULL.

ALTER TABLE public.tasks
DROP CONSTRAINT tasks_baby_id_fkey;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_family_baby_fkey
FOREIGN KEY (family_id, baby_id)
REFERENCES public.babies (family_id, id)
ON DELETE SET NULL (baby_id);