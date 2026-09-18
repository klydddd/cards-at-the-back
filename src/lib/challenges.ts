import type { QuizSourceKind } from '@/types';

// Display helpers shared by every place a challenge is shown: the browse
// cards, the take page, the answer-key page and the deck's challenge list.

const KIND_LABELS: Record<QuizSourceKind, string> = {
  ai: 'AI challenge',
  quick: 'Quick challenge',
  manual: 'Custom challenge',
};

export function challengeKindLabel(kind: QuizSourceKind | undefined) {
  return (kind && KIND_LABELS[kind]) || KIND_LABELS.ai;
}

// A manual challenge carries its own title; a deck-based one borrows the
// deck's. `deckTitle` covers callers that fetched the deck separately instead
// of through the `decks(...)` embed.
export function challengeTitle(
  quiz: { title?: string | null; decks?: { title: string } | null } | null | undefined,
  deckTitle?: string | null
) {
  return quiz?.title?.trim() || quiz?.decks?.title || deckTitle || 'Untitled challenge';
}
