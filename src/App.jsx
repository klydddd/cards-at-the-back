import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CreateDeck from './pages/CreateDeck';
import DeckView from './pages/DeckView';
import Practice from './pages/Practice';
import AIParse from './pages/AIParse';
import Quiz from './pages/Quiz';
import QuizReview from './pages/QuizReview';
import TakeQuiz from './pages/TakeQuiz';
import MCQuiz from './pages/MCQuiz';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateDeck />} />
        <Route path="/deck/:id" element={<DeckView />} />
        <Route path="/deck/:id/practice" element={<Practice />} />
        <Route path="/deck/:id/quiz" element={<Quiz />} />
        <Route path="/deck/:id/quiz/:quizId" element={<QuizReview />} />
        <Route path="/deck/:id/quick-quiz" element={<MCQuiz />} />
        <Route path="/take/:quizId" element={<TakeQuiz />} />
        <Route path="/ai-parse" element={<AIParse />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}
