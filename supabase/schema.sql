-- Health Knowhow Supabase schema draft
-- This file prepares the DB structure for a future migration from CSV/static/localStorage.
-- Review RLS policies carefully before production use.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  email text,
  nickname text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.profiles(id) on delete set null,
  slug text unique,
  disease_id text,
  disease_name text,
  symptom text,
  category text,
  nickname text,
  title text not null,
  summary text,
  content text,
  hospital_visited text,
  helpful_foods text[] not null default '{}',
  caution_foods text[] not null default '{}',
  helpful_exercises text[] not null default '{}',
  helpful_habits text[] not null default '{}',
  helpful_videos text[] not null default '{}',
  caution text,
  related_tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_revision')),
  agree_to_public boolean not null default false,
  agree_medical_disclaimer boolean not null default false,
  admin_note text,
  reviewed_by uuid null references public.profiles(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.symptom_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.profiles(id) on delete set null,
  symptom_name text not null,
  disease_id text null,
  start_date date,
  severity integer check (severity between 1 and 10),
  worse_time text,
  related_foods text,
  medicines text,
  lifestyle_changes text,
  hospital_visit_status text,
  memo text,
  agree_to_share boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_reviews (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  previous_status text,
  new_status text,
  admin_note text,
  reviewer_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.diseases (
  id text primary key,
  slug text unique,
  name text not null,
  category text,
  description text,
  related_symptoms text[] not null default '{}',
  symptoms text[] not null default '{}',
  causes text[] not null default '{}',
  lifestyle text,
  diet text,
  recommended_foods text[] not null default '{}',
  avoid_foods text[] not null default '{}',
  warning_signs text[] not null default '{}',
  department text[] not null default '{}',
  doctor_questions text[] not null default '{}',
  search_keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.symptoms (
  id text primary key,
  name text not null,
  category text,
  description text,
  emergency_level text,
  recommended_action text,
  related_disease_ids text[] not null default '{}',
  search_aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.videos (
  id text primary key,
  disease_id text,
  title text not null,
  channel text,
  summary text,
  url text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id text primary key,
  disease_id text,
  title text not null,
  source text,
  type text,
  summary text,
  url text,
  last_reviewed date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_guides (
  id text primary key,
  disease_id text,
  symptom_keywords text[] not null default '{}',
  title text not null,
  category text,
  description text,
  recommended_exercises text[] not null default '{}',
  caution_exercises text[] not null default '{}',
  suitable_for text,
  not_suitable_for text,
  intensity text,
  frequency text,
  duration text,
  warning text,
  video_search_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diet_guides (
  id text primary key,
  disease_id text,
  symptom_keywords text[] not null default '{}',
  title text not null,
  description text,
  recommended_ingredients text[] not null default '{}',
  caution_ingredients text[] not null default '{}',
  meal_tips text[] not null default '{}',
  avoid_patterns text[] not null default '{}',
  suitable_for text,
  warning text,
  video_search_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_products (
  id text primary key,
  name text not null,
  category text,
  description text,
  recommended_for text[] not null default '{}',
  caution text,
  url text,
  is_affiliate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinics (
  id text primary key,
  department text,
  region text,
  clinic_name text,
  description text,
  homepage_url text,
  is_ad boolean not null default false,
  related_disease_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.experiences enable row level security;
alter table public.symptom_records enable row level security;
alter table public.admin_reviews enable row level security;
alter table public.diseases enable row level security;
alter table public.symptoms enable row level security;
alter table public.videos enable row level security;
alter table public.articles enable row level security;
alter table public.exercise_guides enable row level security;
alter table public.diet_guides enable row level security;
alter table public.affiliate_products enable row level security;
alter table public.clinics enable row level security;

-- RLS policy examples only. Review and harden before production.
-- Example: public approved experiences can be readable by everyone.
-- create policy "read approved public experiences"
-- on public.experiences for select
-- using (status = 'approved' and agree_to_public = true);

-- Example: users can read their own symptom records after auth is implemented.
-- create policy "read own symptom records"
-- on public.symptom_records for select
-- using (auth.uid() = user_id);

-- Example: admins can review pending content when profiles.role = 'admin'.
-- create policy "admins manage experiences"
-- on public.experiences for all
-- using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
