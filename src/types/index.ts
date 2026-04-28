export interface Card {
  id?: string;
  deck_id: string;
  front: string;
  back: string;
  position: number;
  created_at?: string;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  creator_name: string;
  subject?: string;
  created_at: string;
  cards?: { count: number }[];
}

export type QuizSourceKind = 'ai' | 'quick';
export type QuizQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'identification'
  | 'enumeration'
  | 'situational';

export interface QuizQuestion {
  type: QuizQuestionType;
  question: string;
  scenario?: string;
  options?: string[];
  answer: string | boolean | string[];
}

export interface Quiz {
  id: string;
  deck_id: string;
  creator_name: string;
  source_kind: QuizSourceKind;
  questions: QuizQuestion[];
  question_types: QuizQuestionType[];
  subject?: string;
  answers?: Record<number, any>;
  score?: number;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  player_name: string;
  answers: Record<number, string | boolean | string[]>;
  score: number;
  question_count: number;
  elapsed_ms: number;
  started_at: string;
  completed_at: string;
  created_at: string;
}

export interface CardProgress {
  id: string;
  card_id: string;
  deck_id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  due_date: string;
  last_reviewed: string;
  created_at: string;
}
