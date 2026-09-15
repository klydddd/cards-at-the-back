import { Analytics } from '@vercel/analytics/react';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import Navbar from '@/components/Navbar';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata = {
  title: 'gokards',
  description: 'AI-generated flashkards and spaced repetition learning',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <Navbar />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
