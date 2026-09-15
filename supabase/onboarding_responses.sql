-- First-visit onboarding answers, used only for aggregate demographic reports.
-- Inserted only by /api/onboarding using the service role key.
-- RLS is enabled with no policies, so the public anon key can neither read nor write this table.
-- Keep the allowed values in sync with src/lib/onboarding.ts.

create table if not exists onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 1 and 100),
  is_anonymous boolean not null default false,
  age_range text not null check (age_range in ('13-15', '16-17', '18-21', '22-25', '26-plus')),
  grade_level text not null check (grade_level in (
    'grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12',
    'college-1', 'college-2', 'college-3', 'college-4', 'college-5',
    'graduate', 'not-student'
  )),
  strand text check (strand in ('stem', 'abm', 'humss', 'gas', 'tvl', 'sports', 'arts-design', 'other')),
  program text check (program is null or char_length(program) between 1 and 100),
  created_at timestamptz not null default now(),

  -- Strand only applies to Senior High, program only to college and graduate school
  constraint onboarding_strand_matches_grade check (
    (grade_level in ('grade-11', 'grade-12')) = (strand is not null)
  ),
  constraint onboarding_program_matches_grade check (
    (grade_level like 'college-%' or grade_level = 'graduate') = (program is not null)
  )
);

create index if not exists idx_onboarding_responses_created_at on onboarding_responses(created_at desc);

alter table onboarding_responses enable row level security;
