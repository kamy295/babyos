
-- ============================================
-- BabyOS: Initial Database Schema
-- Migration: 001_initial_schema
-- ============================================

-- 1. Families
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Family Members
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL
    REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, user_id)
);

-- 3. Babies
CREATE TABLE public.babies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL
    REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Original Family Notes
CREATE TABLE public.family_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL
    REFERENCES public.families(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL
    REFERENCES public.babies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Structured Baby Events
CREATE TABLE public.baby_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL
    REFERENCES public.families(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL
    REFERENCES public.babies(id) ON DELETE CASCADE,
  source_note_id UUID
    REFERENCES public.family_notes(id) ON DELETE SET NULL,

  content TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (
      category IN (
        'Sleep',
        'Feeding',
        'Activity',
        'Health',
        'Milestone',
        'General'
      )
    ),

  event_date DATE,
  start_time TIME,
  end_time TIME,

  quantity NUMERIC,
  unit TEXT,
  duration_minutes INTEGER
    CHECK (duration_minutes IS NULL OR duration_minutes >= 0),

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Family Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL
    REFERENCES public.families(id) ON DELETE CASCADE,
  baby_id UUID
    REFERENCES public.babies(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_family_members_user
  ON public.family_members(user_id);

CREATE INDEX idx_babies_family
  ON public.babies(family_id);

CREATE INDEX idx_family_notes_family_created
  ON public.family_notes(family_id, created_at DESC);

CREATE INDEX idx_baby_events_family_date
  ON public.baby_events(family_id, event_date DESC);

CREATE INDEX idx_baby_events_baby_category
  ON public.baby_events(baby_id, category);

CREATE INDEX idx_baby_events_source_note
  ON public.baby_events(source_note_id);

CREATE INDEX idx_tasks_family_due
  ON public.tasks(family_id, due_date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baby_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BACKEND ROLE PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON TABLE
  public.families,
  public.family_members,
  public.babies,
  public.family_notes,
  public.baby_events,
  public.tasks
TO service_role;
