import { createClient } from '@supabase/supabase-js';
import type { ChallengeListItem, ChallengeStats, QuizAttempt, QuizQuestion, QuizQuestionType, QuizSourceKind } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url';

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseReady() {
  return !!supabase;
}

// Deck operations

export async function fetchDecks() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('decks')
    .select('*, cards(count)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchDeck(id) {
  if (!supabase) throw new Error('Supabase is not configured. Please add your credentials to the .env file.');

  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchCards(deckId) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createDeck(title, description, creatorName, subject = '') {
  if (!supabase) throw new Error('Supabase is not configured. Please add your credentials to the .env file.');

  const { data, error } = await supabase
    .from('decks')
    .insert({ title, description, creator_name: creatorName, subject: subject || '' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createCards(deckId, cards) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const rows = cards.map((card, i) => ({
    deck_id: deckId,
    front: card.front,
    back: card.back,
    position: i,
  }));

  const { error } = await supabase.from('cards').insert(rows);
  if (error) throw error;
}

// Quiz operations

// `deckId` is null for a manual challenge, which must then bring its own
// `title` (the quizzes_title_or_deck check constraint enforces this).
export async function saveQuiz({
  deckId,
  title,
  creatorName,
  questions,
  questionTypes,
  subject = '',
  sourceKind = 'ai',
}: {
  deckId: string | null;
  title?: string;
  creatorName: string;
  questions: QuizQuestion[];
  questionTypes: QuizQuestionType[];
  subject?: string;
  sourceKind?: QuizSourceKind;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      deck_id: deckId,
      title: title?.trim() || null,
      creator_name: creatorName || 'Anonymous',
      questions,
      question_types: questionTypes,
      subject: subject || '',
      source_kind: sourceKind,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchQuizChallengesByDeck(deckId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('deck_id', deckId)
    .is('answers', null)
    .is('score', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Challenge browsing (across every deck) — powers /challenges

const CHALLENGE_LIST_LIMIT = 200;

// `questions` is selected only so a card can show its question count: PostgREST
// can't compute jsonb_array_length in a select list, and `question_types` holds
// the kinds of question, not how many. If the payload ever matters, add a stored
// generated `question_count` column to `quizzes` and drop `questions` here.
export async function fetchQuizChallenges(limit = CHALLENGE_LIST_LIMIT) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('quizzes')
    .select('id, deck_id, title, creator_name, source_kind, question_types, subject, created_at, questions, decks(title, subject)')
    .is('answers', null)
    .is('score', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as ChallengeListItem[];
}

// Play counts come from an API route, not from here: RLS on `quiz_attempts`
// returns zero rows to the anon key — silently, with no error — so aggregating
// in the browser would always report "no attempts".
export async function fetchChallengeStats(): Promise<Record<string, ChallengeStats>> {
  const response = await fetch('/api/challenges/stats');

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load challenge stats.');
  }

  return data.stats || {};
}

export async function fetchQuiz(quizId) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .single();

  if (error) throw error;
  return data;
}

// Read through the API route, not the anon client: RLS on `quiz_attempts`
// returns zero rows to the anon key silently, so querying it here rendered an
// empty leaderboard on every challenge until the visitor submitted their own.
export async function fetchQuizAttempts(quizId, limit = 10): Promise<QuizAttempt[]> {
  const response = await fetch(`/api/quizzes/${quizId}/attempts`);

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load the leaderboard.');
  }

  return (data.leaderboard || []).slice(0, limit);
}

export async function submitQuizAttempt(
  quizId: string,
  playerName: string,
  answers: Record<number, string | boolean | string[]>,
  startedAt: string,
  completedAt: string
) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const response = await fetch(`/api/quizzes/${quizId}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerName,
      answers,
      startedAt,
      completedAt,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit quiz attempt.');
  }

  return data as SubmittedQuizAttempt;
}

export type SubmittedQuizAttempt = {
  attempt: QuizAttempt;
  score: number;
  questionCount: number;
  elapsedMs: number;
  rank: number;
  leaderboard: QuizAttempt[];
};

// SRS Card Progress operations

export async function fetchCardProgress(deckId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('card_progress')
    .select('*')
    .eq('deck_id', deckId);

  if (error) throw error;
  return data;
}

export async function fetchSingleCardProgress(cardId) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('card_progress')
    .select('*')
    .eq('card_id', cardId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertCardProgress(progress) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('card_progress')
    .upsert(
      {
        card_id: progress.card_id,
        deck_id: progress.deck_id,
        ease_factor: progress.ease_factor,
        interval: progress.interval,
        repetitions: progress.repetitions,
        due_date: progress.due_date,
        last_reviewed: progress.last_reviewed,
      },
      { onConflict: 'card_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function resetDeckSRS(deckId) {
  if (!supabase) return;

  const { error } = await supabase
    .from('card_progress')
    .delete()
    .eq('deck_id', deckId);

  if (error) throw error;
}
