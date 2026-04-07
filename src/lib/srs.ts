// SM-2 Spaced Repetition Algorithm
// Based on SuperMemo-2 with Anki-style rating buttons

// Rating constants
export const Rating = {
  AGAIN: 0, // Complete blackout, reset
  HARD: 1,  // Recalled with serious difficulty
  GOOD: 2,  // Recalled with some effort
  EASY: 3,  // Perfect recall, effortless
};

// Default values for a new card
export function createDefaultProgress(cardId, deckId) {
  return {
    card_id: cardId,
    deck_id: deckId,
    ease_factor: 2.5,
    interval: 0,       // days
    repetitions: 0,
    due_date: new Date().toISOString(),
    last_reviewed: null,
  };
}

// Core SM-2 calculation
// Returns updated { ease_factor, interval, repetitions, due_date, last_reviewed }
export function calculateNextReview(progress, rating) {
  let { ease_factor, interval, repetitions } = progress;
  const now = new Date();

  if (rating === Rating.AGAIN) {
    // Reset — show again soon (1 minute for in-session, but store as 0 days so it's due immediately next session)
    repetitions = 0;
    interval = 0;
    ease_factor = Math.max(1.3, ease_factor - 0.2);
  } else if (rating === Rating.HARD) {
    if (repetitions === 0) {
      interval = 1;
    } else {
      // Interval grows but slower than normal
      interval = Math.max(1, Math.ceil(interval * 1.2));
    }
    repetitions += 1;
    ease_factor = Math.max(1.3, ease_factor - 0.15);
  } else if (rating === Rating.GOOD) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.ceil(interval * ease_factor);
    }
    repetitions += 1;
    // ease_factor stays the same for Good
  } else if (rating === Rating.EASY) {
    if (repetitions === 0) {
      interval = 4;
    } else if (repetitions === 1) {
      interval = 10;
    } else {
      interval = Math.ceil(interval * ease_factor * 1.3);
    }
    repetitions += 1;
    ease_factor += 0.15;
  }

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + interval);

  return {
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval,
    repetitions,
    due_date: dueDate.toISOString(),
    last_reviewed: now.toISOString(),
  };
}

// Check if a card is due for review
export function isDue(progress) {
  if (!progress || !progress.due_date) return true;
  return new Date(progress.due_date) <= new Date();
}

// Get cards that are due from a list of progress records
export function getDueCards(progressRecords) {
  return progressRecords.filter(isDue);
}

// Human-readable interval description
export function formatInterval(interval) {
  if (interval === 0) return 'Now';
  if (interval === 1) return '1 day';
  if (interval < 30) return `${interval} days`;
  if (interval < 365) {
    const months = Math.round(interval / 30);
    return months === 1 ? '1 month' : `${months} months`;
  }
  const years = Math.round(interval / 365 * 10) / 10;
  return years === 1 ? '1 year' : `${years} years`;
}

// Preview what the next interval would be for each rating
export function previewIntervals(progress) {
  return {
    [Rating.AGAIN]: calculateNextReview(progress, Rating.AGAIN).interval,
    [Rating.HARD]: calculateNextReview(progress, Rating.HARD).interval,
    [Rating.GOOD]: calculateNextReview(progress, Rating.GOOD).interval,
    [Rating.EASY]: calculateNextReview(progress, Rating.EASY).interval,
  };
}
