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
  questions jsonb not null,
  answers jsonb default null,
  score int default null,
  question_types text[] not null,
  created_at timestamptz default now()
);

-- Index for fast quiz lookups by deck
create index if not exists idx_quizzes_deck_id on quizzes(deck_id);

-- Row Level Security
alter table decks enable row level security;
alter table cards enable row level security;
alter table quizzes enable row level security;

-- Public read access
create policy "Public read decks" on decks
  for select using (true);

create policy "Public read cards" on cards
  for select using (true);

create policy "Public read quizzes" on quizzes
  for select using (true);

-- Public insert access
create policy "Public insert decks" on decks
  for insert with check (true);

create policy "Public insert cards" on cards
  for insert with check (true);

create policy "Public insert quizzes" on quizzes
  for insert with check (true);

-- Public update for quizzes (to save answers/score)
create policy "Public update quizzes" on quizzes
  for update using (true) with check (true);
