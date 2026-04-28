-- Cards at the Back - Supabase Migration
-- Run this in the Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Decks table
create table if not exists decks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
  subject text not null default '',
  creator_name text not null default 'Anonymous',
  created_at timestamptz default now()
);

-- Cards table
create table if not exists cards (
  id uuid primary key default uuid_generate_v4(),
  deck_id uuid not null references decks(id) on delete cascade,
  front text not null,
  back text not null,
  position int not null default 0
);

-- Index for fast card lookups by deck
create index if not exists idx_cards_deck_id on cards(deck_id);

-- Quizzes table
create table if not exists quizzes (
  id uuid primary key default uuid_generate_v4(),
  deck_id uuid not null references decks(id) on delete cascade,
  creator_name text not null default 'Anonymous',
  source_kind text not null default 'ai',
  subject text not null default '',
  questions jsonb not null,
  answers jsonb default null,
  score int default null,
  question_types text[] not null,
  created_at timestamptz default now()
);

-- Index for fast quiz lookups by deck
create index if not exists idx_quizzes_deck_id on quizzes(deck_id);

create table if not exists quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  player_name text not null,
  answers jsonb not null,
  score int not null,
  question_count int not null,
  elapsed_ms bigint not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_quiz_attempts_quiz_id on quiz_attempts(quiz_id);
create index if not exists idx_quiz_attempts_quiz_score_time on quiz_attempts(quiz_id, score desc, elapsed_ms asc, created_at asc);

-- Row Level Security
alter table decks enable row level security;
alter table cards enable row level security;
alter table quizzes enable row level security;
alter table quiz_attempts enable row level security;

-- Public read access
create policy "Public read decks" on decks
  for select using (true);

create policy "Public read cards" on cards
  for select using (true);

create policy "Public read quizzes" on quizzes
  for select using (true);

create policy "Public read quiz attempts" on quiz_attempts
  for select using (true);

-- Public insert access
create policy "Public insert decks" on decks
  for insert with check (true);

create policy "Public insert cards" on cards
  for insert with check (true);

create policy "Public insert quizzes" on quizzes
  for insert with check (true);
