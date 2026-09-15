// Shared by the onboarding gate and /api/onboarding.
// Keep the values in sync with the check constraints in supabase/onboarding_responses.sql.

export const NAME_MAX = 100;
export const PROGRAM_MAX = 100;

// 'under-13' is a choice in the form, but it blocks onboarding and is never stored
export const UNDER_13 = 'under-13';

export const AGE_RANGES = [
    { value: UNDER_13, label: 'Under 13' },
    { value: '13-15', label: '13–15' },
    { value: '16-17', label: '16–17' },
    { value: '18-21', label: '18–21' },
    { value: '22-25', label: '22–25' },
    { value: '26-plus', label: '26 and up' },
] as const;

export const GRADE_LEVEL_GROUPS = [
    {
        label: 'Junior High School',
        levels: [
            { value: 'grade-7', label: 'Grade 7' },
            { value: 'grade-8', label: 'Grade 8' },
            { value: 'grade-9', label: 'Grade 9' },
            { value: 'grade-10', label: 'Grade 10' },
        ],
    },
    {
        label: 'Senior High School',
        levels: [
            { value: 'grade-11', label: 'Grade 11' },
            { value: 'grade-12', label: 'Grade 12' },
        ],
    },
    {
        label: 'College',
        levels: [
            { value: 'college-1', label: '1st year college' },
            { value: 'college-2', label: '2nd year college' },
            { value: 'college-3', label: '3rd year college' },
            { value: 'college-4', label: '4th year college' },
            { value: 'college-5', label: '5th year college' },
            { value: 'graduate', label: 'Graduate school' },
        ],
    },
    {
        label: 'Other',
        levels: [{ value: 'not-student', label: 'Not currently a student' }],
    },
] as const;

export const SHS_STRANDS = [
    { value: 'stem', label: 'STEM' },
    { value: 'abm', label: 'ABM' },
    { value: 'humss', label: 'HUMSS' },
    { value: 'gas', label: 'GAS' },
    { value: 'tvl', label: 'TVL' },
    { value: 'sports', label: 'Sports' },
    { value: 'arts-design', label: 'Arts and Design' },
    { value: 'other', label: 'Other' },
] as const;

export const PROGRAM_SUGGESTIONS = [
    'BS Computer Science',
    'BS Information Technology',
    'BS Computer Engineering',
    'BS Civil Engineering',
    'BS Electrical Engineering',
    'BS Mechanical Engineering',
    'BS Nursing',
    'BS Medical Technology',
    'BS Pharmacy',
    'BS Psychology',
    'BS Biology',
    'BS Accountancy',
    'BS Business Administration',
    'BS Hospitality Management',
    'BS Tourism Management',
    'BS Criminology',
    'BS Architecture',
    'BA Communication',
    'BA Political Science',
    'Bachelor of Elementary Education',
    'Bachelor of Secondary Education',
];

export type AgeRange = (typeof AGE_RANGES)[number]['value'];
export type GradeLevel = (typeof GRADE_LEVEL_GROUPS)[number]['levels'][number]['value'];
export type ShsStrand = (typeof SHS_STRANDS)[number]['value'];

export function isAgeRange(value: unknown): value is AgeRange {
    return AGE_RANGES.some((age) => age.value === value);
}

export function isGradeLevel(value: unknown): value is GradeLevel {
    return GRADE_LEVEL_GROUPS.some((group) => group.levels.some((level) => level.value === value));
}

export function isShsStrand(value: unknown): value is ShsStrand {
    return SHS_STRANDS.some((strand) => strand.value === value);
}

export function needsStrand(grade: GradeLevel | '') {
    return grade === 'grade-11' || grade === 'grade-12';
}

export function needsProgram(grade: GradeLevel | '') {
    return grade.startsWith('college-') || grade === 'graduate';
}

const ONBOARDING_KEY = 'gokards_onboarding_id';

export function getOnboardingId() {
    try {
        return localStorage.getItem(ONBOARDING_KEY);
    } catch {
        return null;
    }
}

export function hasOnboarded() {
    return Boolean(getOnboardingId());
}

export function markOnboarded(id: string) {
    try {
        localStorage.setItem(ONBOARDING_KEY, id);
    } catch {
        // Storage blocked (private mode, etc.) — onboarding will show again next visit
    }
}
