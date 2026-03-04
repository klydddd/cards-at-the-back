-- Cards at the Back - Supabase Migration
-- Run this in the Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Decks table
create table if not exists decks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
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

-- Row Level Security
alter table decks enable row level security;
alter table cards enable row level security;

-- Public read access
create policy "Public read decks" on decks
  for select using (true);

create policy "Public read cards" on cards
  for select using (true);

-- Public insert access
create policy "Public insert decks" on decks
  for insert with check (true);

create policy "Public insert cards" on cards
  for insert with check (true);
