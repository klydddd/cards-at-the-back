import { Analytics } from '@vercel/analytics/react';
import { Bricolage_Grotesque, Onest } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WelcomeGate from '@/components/WelcomeGate';
import WhatsNew from '@/components/WhatsNew';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
});

const onest = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-onest',
  display: 'swap',
});

export const metadata = {
  title: 'gokards',
  description: 'AI-generated flashkards and spaced repetition learning',
};

// Stamps data-theme and data-sound before first paint. Without this the
// attributes are only set after hydration, so dark-mode users see a full cream
// page flash on every load and the navbar icons flip. Must mirror
// getInitialTheme() in src/lib/theme.ts and isSoundEnabled() in src/lib/sounds.ts.
const themeScript = `(function(){try{var t=localStorage.getItem('cards_theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);var s=localStorage.getItem('cards_sound');document.documentElement.setAttribute('data-sound',s==='off'?'off':'on');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${onest.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Navbar />
        <div className="app-main">{children}</div>
        <Footer />
        <WelcomeGate />
        <WhatsNew />
        <Analytics />
      </body>
    </html>
  );
}
