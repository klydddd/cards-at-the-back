import type { QuizQuestion, QuizQuestionType } from '@/types';

// Draft shape for the hand-written challenge builder (/create/challenge) and
// the validation that turns it into the `questions` jsonb saved on `quizzes`.
//
// Only multiple choice exists today. Each draft question carries its `type`
// so another kind is a new union member here plus a new `case` in
// `buildQuestion` — the builder page switches on the same field.

export const TITLE_MAX_LENGTH = 120;
export const MIN_QUESTIONS = 2;
export const MAX_QUESTIONS = 50;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

export interface McqDraft {
  type: 'multiple_choice';
  question: string;
  options: string[];
  // Index into `options`; null until the author picks one
  correctIndex: number | null;
}

export type QuestionDraft = McqDraft;

export interface ManualQuizDraft {
  title: string;
  questions: QuestionDraft[];
}

export const emptyMcqDraft = (optionCount = 4): McqDraft => ({
  type: 'multiple_choice',
  question: '',
  options: Array.from({ length: optionCount }, () => ''),
  correctIndex: null,
});

type ValidationResult =
  | { ok: true; questions: QuizQuestion[]; questionTypes: QuizQuestionType[] }
  | { ok: false; error: string };

function buildQuestion(draft: QuestionDraft, number: number): QuizQuestion | string {
  const question = draft.question.trim();
  if (!question) return `Question ${number} needs some text.`;

  switch (draft.type) {
    case 'multiple_choice': {
      const options = draft.options.map((option) => option.trim());
      if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
        return `Question ${number} needs between ${MIN_OPTIONS} and ${MAX_OPTIONS} options.`;
      }
      if (options.some((option) => !option)) {
        return `Question ${number} has an empty option.`;
      }

      const seen = new Set<string>();
      for (const option of options) {
        const key = option.toLowerCase();
        if (seen.has(key)) return `Question ${number} lists "${option}" twice.`;
        seen.add(key);
      }

      if (
        draft.correctIndex === null ||
        draft.correctIndex < 0 ||
        draft.correctIndex >= options.length
      ) {
        return `Question ${number} needs a correct answer marked.`;
      }

      return { type: 'multiple_choice', question, options, answer: options[draft.correctIndex] };
    }
  }
}

export function validateManualQuiz(draft: ManualQuizDraft): ValidationResult {
  const title = draft.title.trim();
  if (!title) return { ok: false, error: 'Give your challenge a title.' };
  if (title.length > TITLE_MAX_LENGTH) {
    return { ok: false, error: `Keep the title under ${TITLE_MAX_LENGTH} characters.` };
  }

  if (draft.questions.length < MIN_QUESTIONS) {
    return { ok: false, error: `Add at least ${MIN_QUESTIONS} questions.` };
  }
  if (draft.questions.length > MAX_QUESTIONS) {
    return { ok: false, error: `A challenge can have at most ${MAX_QUESTIONS} questions.` };
  }

  const questions: QuizQuestion[] = [];
  for (const [index, questionDraft] of draft.questions.entries()) {
    const built = buildQuestion(questionDraft, index + 1);
    if (typeof built === 'string') return { ok: false, error: built };
    questions.push(built);
  }

  const questionTypes = Array.from(new Set(questions.map((q) => q.type)));
  return { ok: true, questions, questionTypes };
}
