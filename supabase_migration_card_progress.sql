-- Migration: Create card_progress table for Spaced Repetition System (SRS)
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

create table if not exists card_progress (
  id uuid default gen_random_uuid() primary key,
  card_id uuid not null references cards(id) on delete cascade,
  deck_id uuid not null references decks(id) on delete cascade,
  ease_factor numeric(5, 2) not null default 2.5,
  interval integer not null default 0,
  repetitions integer not null default 0,
  due_date timestamptz not null default now(),
  last_reviewed timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint card_progress_card_id_unique unique (card_id)
);

-- Index for fast deck-level queries
create index if not exists idx_card_progress_deck_id on card_progress(deck_id);

-- Index for finding due cards
create index if not exists idx_card_progress_due_date on card_progress(due_date);

-- Auto-update the updated_at timestamp
create or replace function update_card_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger card_progress_updated_at
  before update on card_progress
  for each row
  execute function update_card_progress_updated_at();

-- Enable Row Level Security (adjust policies to match your auth setup)
alter table card_progress enable row level security;

-- Allow all operations for now (public, no auth guard — matches the app's current pattern)
create policy "Allow all access to card_progress"
  on card_progress
  for all
  using (true)
  with check (true);
