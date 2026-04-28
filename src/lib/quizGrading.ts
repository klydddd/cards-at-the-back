import type { QuizQuestion } from '@/types';

function normalizeString(value: string) {
  return value.trim().toLowerCase();
}

function normalizeArray(value: string[]) {
  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .sort();
}

function normalizeUserAnswer(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeArray(value.filter((item): item is string => typeof item === 'string'));
  }

  if (typeof value === 'string') {
    return normalizeString(value);
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return null;
}

export function isAnswerCorrect(question: QuizQuestion, userAnswer: unknown) {
  if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
    return false;
  }

  if (Array.isArray(question.answer)) {
    const expected = normalizeArray(question.answer);
    const actual = Array.isArray(userAnswer)
      ? normalizeArray(userAnswer.filter((item): item is string => typeof item === 'string'))
      : typeof userAnswer === 'string'
        ? normalizeArray(userAnswer.split(','))
        : [];

    if (actual.length !== expected.length) {
      return false;
    }

    return expected.every((item, index) => item === actual[index]);
  }

  if (typeof question.answer === 'string') {
    return normalizeUserAnswer(userAnswer) === normalizeString(question.answer);
  }

  if (typeof question.answer === 'boolean') {
    return normalizeUserAnswer(userAnswer) === question.answer;
  }

  return false;
}

export function gradeQuizAttempt(
  questions: QuizQuestion[],
  answers: Record<number, unknown> = {}
) {
  const score = questions.reduce((total, question, index) => {
    return total + (isAnswerCorrect(question, answers[index]) ? 1 : 0);
  }, 0);

  return {
    score,
    questionCount: questions.length,
  };
}
