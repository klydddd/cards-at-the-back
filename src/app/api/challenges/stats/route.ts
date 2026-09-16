import { NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabaseAdmin';

// Play counts for the /challenges browse page.
//
// This has to run server-side: RLS on `quiz_attempts` returns zero rows to the
// anon key (silently, with no error), so the browser cannot aggregate this
// itself. Only aggregates are returned here — never player names or answers.
export async function GET() {
    try {
        const supabase = createServiceRoleSupabaseClient();

        const { data, error } = await supabase
            .from('quiz_attempts')
            .select('quiz_id, player_name, score, question_count');

        if (error) throw error;

        const tally: Record<
            string,
            { names: Set<string>; attempts: number; topPercent: number | null }
        > = {};

        (data || []).forEach((row) => {
            const entry =
                tally[row.quiz_id] ||
                (tally[row.quiz_id] = { names: new Set(), attempts: 0, topPercent: null });

            entry.attempts += 1;

            const name = (row.player_name || '').trim().toLowerCase();
            if (name) entry.names.add(name);

            if (row.question_count > 0) {
                const pct = Math.round((row.score / row.question_count) * 100);
                if (entry.topPercent === null || pct > entry.topPercent) entry.topPercent = pct;
            }
        });

        const stats: Record<string, { players: number; attempts: number; topPercent: number | null }> = {};
        Object.entries(tally).forEach(([quizId, entry]) => {
            stats[quizId] = {
                // Distinct names, so "N players" stays honest when someone replays
                players: entry.names.size || entry.attempts,
                attempts: entry.attempts,
                topPercent: entry.topPercent,
            };
        });

        return NextResponse.json({ stats });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Failed to load challenge stats.' },
            { status: 500 }
        );
    }
}
