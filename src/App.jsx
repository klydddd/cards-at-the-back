import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CreateDeck from './pages/CreateDeck';
import DeckView from './pages/DeckView';
import Practice from './pages/Practice';
import AIParse from './pages/AIParse';
import Quiz from './pages/Quiz';

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
        <Route path="/ai-parse" element={<AIParse />} />
      </Routes>
    </BrowserRouter>
  );
}
