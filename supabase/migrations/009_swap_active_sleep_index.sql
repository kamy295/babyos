BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class AS index_class
    JOIN pg_namespace AS index_namespace
      ON index_namespace.oid = index_class.relnamespace
    JOIN pg_index AS index_metadata
      ON index_metadata.indexrelid = index_class.oid
    JOIN pg_class AS table_class
      ON table_class.oid = index_metadata.indrelid
    JOIN pg_namespace AS table_namespace
      ON table_namespace.oid = table_class.relnamespace
    WHERE index_namespace.nspname = 'public'
      AND index_class.relname = 'idx_one_active_tracker_sleep_per_baby'
      AND table_namespace.nspname = 'public'
      AND table_class.relname = 'baby_events'
      AND index_metadata.indisunique
      AND index_metadata.indisvalid
      AND index_metadata.indisready
      AND index_metadata.indislive
  ) THEN
    RAISE EXCEPTION
      'Replacement tracker sleep index is missing or not valid; old index was not removed.';
  END IF;
END;
$$;

DROP INDEX public.idx_one_active_sleep_per_baby;

ALTER INDEX public.idx_one_active_tracker_sleep_per_baby
RENAME TO idx_one_active_sleep_per_baby;

COMMIT;
