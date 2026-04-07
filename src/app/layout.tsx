import { Analytics } from '@vercel/analytics/react';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata = {
  title: 'Cards at the Back',
  description: 'AI-generated flashcards and spaced repetition learning',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
