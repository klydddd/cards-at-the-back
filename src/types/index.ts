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

export interface Quiz {
  id: string;
  deck_id: string;
  creator_name: string;
  questions: any[]; 
  question_types: Record<string, number>;
  subject?: string;
  answers?: Record<number, any>;
  score?: number;
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
