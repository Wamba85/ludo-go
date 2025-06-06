// app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

// ==========================
// Shared fonts & metadata
// ==========================
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GoLingo · Impara il Go giocando',
  description:
    'Piattaforma per imparare il gioco del Go attraverso lezioni interattive e partite guidate.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-b from-white to-amber-50 dark:from-zinc-950 dark:to-zinc-900`}
      >
        {children}
      </body>
    </html>
  );
}
