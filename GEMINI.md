# GEMINI.md

## Project Overview
**Cards at the Back** is a Next.js-based application for creating and studying flashcards and quizzes. It features manual deck creation as well as AI-powered generation from documents (PDF, Word, ZIP) using Google's Gemini models.

### Core Technologies
- **Frontend/Framework**: Next.js 15+ (App Router), React 19, TypeScript
- **Backend Services**: Supabase (Database & Auth)
- **AI Integration**: Google Generative AI (Gemini 1.5/2.5/3.1 Flash & Gemma)
- **File Parsing**: `pdfjs-dist` (PDF), `mammoth` (Word), `jszip` (ZIP)
- **State & Analytics**: LocalStorage for tracking, Vercel Analytics

## Building and Running

### Environment Setup
Create a `.env` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### Commands
- `npm run dev`: Starts the development server.
- `npm run build`: Builds the production application.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint for code quality checks.

## Architecture & Directory Structure

- `src/app/`: Next.js App Router pages and API routes.
  - `api/gemini/`: Server-side AI endpoints for parsing and quiz generation.
- `src/components/`: Reusable UI components (Navbar, DeckCard, FlipCard, etc.).
- `src/lib/`: Core logic and service integrations.
  - `supabase.ts`: Database operations (Decks, Cards, Quizzes, Progress).
  - `gemini.ts`: Client-side wrapper for AI operations.
  - `srs.ts`: Spaced Repetition System logic (SuperMemo-2 algorithm).
  - `pdfParser.ts` / `docParser.ts`: Document text extraction logic.
- `src/types/`: TypeScript interfaces for core entities.

## Development Conventions

### Flashcard Structure
- **Front**: Description or definition of the concept.
- **Back**: The term, keyword, or short answer.
- This convention is enforced by the AI prompt in `src/app/api/gemini/parse/route.ts` and expected by quiz generators.

### Graceful Degradation
- Use `isSupabaseReady()` and `isGeminiReady()` to check for service availability before performing operations.
- The app should remain functional (e.g., local tracking) even if backend services are unconfigured.

### Database Schema (Supabase)
- `decks`: `id, title, description, creator_name, subject, created_at`
- `cards`: `id, deck_id, front, back, position`
- `quizzes`: `id, deck_id, creator_name, questions (JSON), question_types (JSON), answers (JSON), score`
- `card_progress`: `card_id (PK), deck_id, ease_factor, interval, repetitions, due_date, last_reviewed`

### Spaced Repetition (SRS)
- Progress is tracked per card using the `card_progress` table.
- Review sessions use the `due_date` to filter cards that need attention.

## AI Implementation Details
- The system attempts multiple Gemini models (`gemini-2.5-flash`, `gemini-3.1-flash-lite-preview`, `gemma-3-27b-it`) in sequence to ensure reliability.
- Prompts are designed to return raw JSON for direct parsing into the database structure.
