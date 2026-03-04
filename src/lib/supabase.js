import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

export async function createDeck(title, description, creatorName) {
  if (!supabase) throw new Error('Supabase is not configured. Please add your credentials to the .env file.');

  const { data, error } = await supabase
    .from('decks')
    .insert({ title, description, creator_name: creatorName })
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
