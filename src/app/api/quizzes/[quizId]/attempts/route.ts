import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabaseAdmin';
import { gradeQuizAttempt } from '@/lib/quizGrading';

type RouteContext = {
  params: Promise<{ quizId: string }>;
};

// Fields the leaderboard renders. Deliberately excludes `answers` so one
// player's submission is never exposed to another.
const LEADERBOARD_FIELDS = 'id, quiz_id, player_name, score, question_count, elapsed_ms, created_at';

// Ranked best-first, then fastest, then earliest — the order the
// idx_quiz_attempts_quiz_score_time index is built for.
async function fetchRankedAttempts(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  quizId: string,
  fields: string
) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select(fields)
    .eq('quiz_id', quizId)
    .order('score', { ascending: false })
    .order('elapsed_ms', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// The leaderboard has to be read server-side: RLS on `quiz_attempts` returns
// zero rows to the anon key — silently, with no error — so a browser-side
// query always renders an empty board.
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const supabase = createServiceRoleSupabaseClient();
    const attempts = await fetchRankedAttempts(supabase, quizId, LEADERBOARD_FIELDS);

    return NextResponse.json({ leaderboard: attempts.slice(0, 10) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load the leaderboard.' },
      { status: 500 }
    );
  }
}

function parseAttemptTime(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { quizId } = await context.params;
    const { playerName, answers, startedAt, completedAt } = await request.json();

    const trimmedPlayerName = typeof playerName === 'string' ? playerName.trim() : '';
    if (!trimmedPlayerName) {
      return NextResponse.json({ error: 'Player name is required.' }, { status: 400 });
    }

    const started = parseAttemptTime(startedAt);
    const completed = parseAttemptTime(completedAt);
    if (!started || !completed || completed.getTime() < started.getTime()) {
      return NextResponse.json({ error: 'Attempt timing is invalid.' }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, questions')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    const safeAnswers = answers && typeof answers === 'object' ? answers : {};
    const { score, questionCount } = gradeQuizAttempt(quiz.questions || [], safeAnswers);
    const elapsedMs = Math.max(0, completed.getTime() - started.getTime());

    const { data: savedAttempt, error: insertError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        player_name: trimmedPlayerName,
        answers: safeAnswers,
        score,
        question_count: questionCount,
        elapsed_ms: elapsedMs,
        started_at: started.toISOString(),
        completed_at: completed.toISOString(),
      })
      .select('*')
      .single();

    if (insertError || !savedAttempt) {
      throw insertError || new Error('Failed to save quiz attempt.');
    }

    const rankedAttempts = await fetchRankedAttempts(supabase, quizId, LEADERBOARD_FIELDS);

    const leaderboard = rankedAttempts.slice(0, 10);
    const rank = rankedAttempts.findIndex((attempt: any) => attempt.id === savedAttempt.id) + 1;

    return NextResponse.json({
      attempt: savedAttempt,
      score,
      questionCount,
      elapsedMs,
      rank,
      leaderboard,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to submit quiz attempt.' },
      { status: 500 }
    );
  }
}
