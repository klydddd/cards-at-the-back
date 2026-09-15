# gokards

gokards is a React-based application designed to help users learn and test their knowledge using flashkards and quizzes. It includes standard manual flashkard deck creation alongside advanced AI-powered document parsing to automatically generate study materials from PDFs, Word documents, and other files.

## Features

* Flashkard Deck Management: Create, view, and organize custom decks of flashkards.
* AI-Powered Deck Generation: Upload documents (PDF, Word, or ZIP) and use Google's Generative AI (Gemini) to automatically parse content and generate relevant flashkards.
* Practice Mode: Review your flashkards with an intuitive flipping interface.
* Quiz Modes: Test your knowledge with standard quizzes, multiple-choice quick quizzes, and review options.
* Secure Data Storage: Powered by Supabase for reliable authentication and database management.

## Technology Stack

* Frontend: React 19, Vite, React Router DOM
* Backend Services: Supabase (Auth & Database)
* AI Integration: Google Generative AI (@google/generative-ai)
* File Parsing: 
  * pdfjs-dist (PDF document processing)
  * mammoth (Word document processing)
  * jszip (ZIP file handling)
* Analytics: Vercel Analytics

## Prerequisites

Before running the project locally, ensure you have the following installed:
* Node.js (v18 or higher recommended)
* npm or yarn
* A Supabase project with your database configured
* A Google Gemini API key

## Installation and Setup

1. Clone the repository
   Navigate to the directory where you want to clone the project and run your standard git clone command.

2. Install dependencies
   ```bash
   npm install
   ```

3. Environment Configuration
   Create a `.env` file in the root directory of the project. You can use `.env.example` as a template. Add your distinct keys:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. Start the development server
   ```bash
   npm run dev
   ```
   The application should now be running on the default Vite port (usually http://localhost:5173).

## Project Structure

* `src/pages/`: Contains the main route components (Home, CreateDeck, DeckView, Practice, AIParse, Quiz, etc.).
* `src/components/`: Reusable UI components including the Navbar, Icons, and Flipcards.
* `src/lib/`: Application utilities and configuration setups (e.g., Supabase client initialization).
* `supabase/`: Potential configuration or migration files for your Supabase backend.

## Building for Production

To build the project for production, run:

```bash
npm run build
```

This will generate a `dist` directory with the optimized static assets ready to be deployed to your hosting provider of choice.

## Linting

To run the ESLint configuration and check for code issues:

```bash
npm run lint
```