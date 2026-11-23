REVOKE TRUNCATE, REFERENCES, TRIGGER
ON TABLE
  public.families,
  public.family_members,
  public.babies,
  public.family_notes,
  public.baby_events,
  public.tasks
FROM anon, authenticated;