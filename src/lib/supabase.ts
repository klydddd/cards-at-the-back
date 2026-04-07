import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url';

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseReady() {
  return !!supabase;
}

// ─── Deck operations ───

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

// ─── Quiz operations ───

export async function saveQuiz(deckId, creatorName, questions, questionTypes, subject = '') {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      deck_id: deckId,
      creator_name: creatorName || 'Anonymous',
      questions,
      question_types: questionTypes,
      subject: subject || '',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuizResults(quizId, answers, score) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase
    .from('quizzes')
    .update({ answers, score })
    .eq('id', quizId);

  if (error) throw error;
}

export async function fetchQuizzesByDeck(deckId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
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

export async function fetchAllQuizzes(limit = 20) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('quizzes')
    .select('*, decks(title)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// ─── SRS Card Progress operations ───

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
