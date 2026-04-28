-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.card_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL UNIQUE,
  deck_id uuid NOT NULL,
  ease_factor numeric NOT NULL DEFAULT 2.5,
  interval integer NOT NULL DEFAULT 0,
  repetitions integer NOT NULL DEFAULT 0,
  due_date timestamp with time zone NOT NULL DEFAULT now(),
  last_reviewed timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT card_progress_pkey PRIMARY KEY (id),
  CONSTRAINT card_progress_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id),
  CONSTRAINT card_progress_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES public.decks(id)
);
CREATE TABLE public.cards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  deck_id uuid NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  CONSTRAINT cards_pkey PRIMARY KEY (id),
  CONSTRAINT cards_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES public.decks(id)
);
CREATE TABLE public.decks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text DEFAULT ''::text,
  creator_name text NOT NULL DEFAULT 'Anonymous'::text,
  created_at timestamp with time zone DEFAULT now(),
  subject text NOT NULL DEFAULT ''::text,
  CONSTRAINT decks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.quiz_attempts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  quiz_id uuid NOT NULL,
  player_name text NOT NULL,
  answers jsonb NOT NULL,
  score integer NOT NULL,
  question_count integer NOT NULL,
  elapsed_ms bigint NOT NULL,
  started_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id)
);
CREATE TABLE public.quizzes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  deck_id uuid NOT NULL,
  creator_name text NOT NULL DEFAULT 'Anonymous'::text,
  questions jsonb NOT NULL,
  answers jsonb,
  score integer,
  question_types ARRAY NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  subject text NOT NULL DEFAULT ''::text,
  CONSTRAINT quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT quizzes_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES public.decks(id)
);