# Next.js Migration Tasks: Cards at the Back

This document outlines a detailed, step-by-step plan for migrating the `cards-at-the-back` web application from a purely client-side React (Vite) architecture to Next.js using the App Router.

## Phase 1: Project Setup and Foundation

- [x] **Initialize Next.js Configuration**
  - Install Next.js dependencies: `npm install next`
  - Remove Vite dependencies: `npm uninstall vite @vitejs/plugin-react`
  - Create a `next.config.js` (or `.mjs`) file at the root.
  - Update `package.json` scripts:
    ```json
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint"
    }
    ```

- [x] **Update Environment Variables**
  - Rename environment variables in `.env` and `.env.example` to follow Next.js conventions:
    - `VITE_SUPABASE_URL` -> `NEXT_PUBLIC_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `VITE_GEMINI_API_KEY` -> `GEMINI_API_KEY`
  - Globally search the codebase and replace `import.meta.env.VITE_` with `process.env.NEXT_PUBLIC_`.

- [x] **File Cleanup**
  - Delete `vite.config.js`.
  - Delete `index.html` (Next.js automatically handles the document structure).
  - Delete `src/main.jsx` (Entry points are now handled by App Router `layout.jsx` and `page.jsx`).

## Phase 2: Building the App Router Shell

- [x] **Create the Root Layout (`src/app/layout.jsx`)**
  - Initialize `src/app/layout.jsx`.
  - Define root metadata (Title, Description).
  - Port global structure from old `App.jsx` and `index.html`:
    - Add `<html>` and `<body>` tags.
    - Insert `<Navbar />`.
    - Render `{children}`.
    - Insert `<Analytics />` from `@vercel/analytics/react`.
  
- [x] **Global Styles Migration**
  - Create `src/app/globals.css`.
  - Move the contents of `src/index.css` to `src/app/globals.css`.
  - Import `globals.css` into `src/app/layout.jsx`.
  - Delete `src/index.css`.
  - Move any static assets to a new `public/` folder in the root path.

## Phase 2.5: TypeScript Initialization and Conversion

- [x] **Install TypeScript and Setup**
  - Run `npm install -D typescript`. (Note: `@types/react` and `@types/react-dom` are already in `devDependencies`).
  - Create an empty `tsconfig.json` in the root directory.
  - Run `npm run dev` briefly to allow Next.js to auto-populate `tsconfig.json` and generate `next-env.d.ts`.
- [x] **Rename Existing App Shell Files**
  - Rename `src/app/layout.jsx` to `src/app/layout.tsx`.
  - Rename `src/components/Navbar.jsx` to `src/components/Navbar.tsx` and add types for any state or props.
- [x] **Create Global Types**
  - Create `src/types/index.ts` to define shared interfaces (e.g., `Card`, `Deck`, `Quiz`, `CardProgress`).

## Phase 3: Updating Navigation and Routing Concepts

Before mapping individual pages, the underlying APIs for routing must be replaced across all components and pages.

- [x] **Replace `<Link>` Tags**
  - Change `import { Link } from 'react-router-dom'` to `import Link from 'next/link'`.
  - Change `to="..."` prop to `href="..."`.
  - *Note*: Ensure no `<a href="">` tags were improperly used for internal navigation; replace them with Next.js `<Link>`.

- [x] **Replace Imperative Navigation (`useNavigate`)**
  - Change `import { useNavigate } from 'react-router-dom'` to `import { useRouter } from 'next/navigation'`.
  - Replace `const navigate = useNavigate();` with `const router = useRouter();`.
  - Update usage: `navigate('/path')` becomes `router.push('/path')`.

- [x] **Replace Route Parameters (`useParams`)**
  - Next.js passes dynamic route segments directly as props to the Page component. For example: `export default function Page({ params }) { ... }`.
  - Alternatively, in client components deeper in the tree, use `import { useParams } from 'next/navigation'`.

## Phase 4: Migrating Pages to the App Router Directory Structure

Recreate the routing structure mapping `react-router-dom` paths to Next.js folders.

*(Note: Add `"use client";` at the very top of each page since the original app heavily utilizes React hooks (useState, useEffect) and browser APIs. After migration, consider optimizing specific pages to Server Components if appropriate.)*

- [x] **Home Page**
  - Action: Move `src/pages/Home.jsx` to `src/app/page.tsx`.
- [x] **Create Deck (`/create`)**
  - Action: Move `src/pages/CreateDeck.jsx` to `src/app/create/page.tsx`.
- [x] **AI Parse (`/ai-parse`)**
  - Action: Move `src/pages/AIParse.jsx` to `src/app/ai-parse/page.tsx`.
- [x] **Deck View (`/deck/:id`)**
  - Action: Move `src/pages/DeckView.jsx` to `src/app/deck/[id]/page.tsx`.
- [x] **Practice Mode (`/deck/:id/practice`)**
  - Action: Move `src/pages/Practice.jsx` to `src/app/deck/[id]/practice/page.tsx`.
- [x] **Quiz Selection (`/deck/:id/quiz`)**
  - Action: Move `src/pages/Quiz.jsx` to `src/app/deck/[id]/quiz/page.tsx`.
- [x] **Quiz Review (`/deck/:id/quiz/:quizId`)**
  - Action: Move `src/pages/QuizReview.jsx` to `src/app/deck/[id]/quiz/[quizId]/page.tsx`.
- [x] **Quick MCQ (`/deck/:id/quick-quiz`)**
  - Action: Move `src/pages/MCQuiz.jsx` to `src/app/deck/[id]/quick-quiz/page.tsx`.
- [x] **Review Mode (`/deck/:id/review`)**
  - Action: Move `src/pages/Review.jsx` to `src/app/deck/[id]/review/page.tsx`.
- [x] **Take Quiz (`/take/:quizId`)**
  - Action: Move `src/pages/TakeQuiz.jsx` to `src/app/take/[quizId]/page.tsx`.
- [x] **Delete Old Boilerplate**
  - Delete `src/App.jsx`.
  - Empty or remove the old `src/pages/` folder once all pages have been transferred.

## Phase 5: Library & Component Refactor

- [x] **Data Fetching and Hooks (Components)**
  - Rename files in `src/components/` from `.jsx` to `.tsx`.
  - Add TypeScript interfaces for all component props.
  - Ensure all files in `src/components/` natively handle Next.js client constraints by defining `"use client";` at the top of interactive components (e.g., forms, flip cards).
- [x] **Supabase & Services Setup (`src/lib/`)**
  - Rename relevant utility files from `.js` to `.ts`.
  - Review `src/lib/supabase.ts`, `gemini.ts`, and tracking scripts.
  - Verify that `process.env.NEXT_PUBLIC_*` resolves properly within these utility scripts.
  - Check browser-specific utilities (`srs.ts`, pdf/doc parsers). Make sure they are cleanly abstracted so Next.js SSR build process doesn't break.

## Phase 6: Testing & Cleanup

- [x] Test the development build using `npm run dev`.
  - Validate navigation (App Shell -> Create Deck -> Practice -> Quizzes).
  - Check browser console for Hydration Mismatches or standard errors.
- [x] Remove `react-router-dom` from `package.json`: `npm uninstall react-router-dom`
- [x] Run a test production build (`npm run build`) to ensure all paths are statically and dynamically analyzable by Next.js.
- [x] Start the built server (`npm run start`) and complete an end-to-end user flow:
  - Create a new Deck.
  - Add Cards and run an AI parse.
  - Review deck and navigate between routes.
