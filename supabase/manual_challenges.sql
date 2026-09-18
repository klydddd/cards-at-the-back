-- Migration: challenges that are written by hand, with no deck behind them
-- Generated on 2026-09-18
--
-- A manual challenge has no deck to borrow a title from, so it carries its
-- own. Deck-based quizzes keep `title` null and keep using the deck's title.

alter table public.quizzes alter column deck_id drop not null;

alter table public.quizzes add column if not exists title text;

-- A quiz must have somewhere to get its title from
alter table public.quizzes add constraint quizzes_title_or_deck
  check (deck_id is not null or (title is not null and length(trim(title)) > 0));
