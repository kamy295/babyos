BEGIN;

ALTER TABLE public.tasks
ADD COLUMN legacy_id TEXT;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_family_id_legacy_id_key
UNIQUE (family_id, legacy_id);

CREATE INDEX idx_tasks_family_created
ON public.tasks (family_id, created_at DESC, id DESC);

COMMIT;
