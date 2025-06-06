// ==================================================
// app/page.tsx  (Dashboard principale + LearningPath)
// ==================================================
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Star, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

// ⚠️ Da sostituire con dati reali via API o context una volta disponibile il backend
const mockData = {
  xp: 320,
  nextLevelXP: 500,
  streak: 7,
  dailyGoalCurrent: 3,
  dailyGoalTarget: 5,
};

export default function Dashboard() {
  const progress = Math.min(100, (mockData.xp / mockData.nextLevelXP) * 100);

  // Placeholder percorso (6 lezioni + riepilogo)
  const pathLevels = useMemo(
    () => [
      { id: 1, name: 'Cattura base' },
      { id: 2, name: 'Salvataggio gruppi' },
      { id: 3, name: 'Libertà & Atari' },
      { id: 4, name: 'Ko e regole speciali' },
      { id: 5, name: 'Shape fondamentali' },
      { id: 6, name: 'Tesuji introduttivi' },
      { id: 7, name: 'Riepilogo modulo', isReview: true },
    ],
    [],
  );

  return (
    <div className="flex flex-col items-center px-6 py-8 bg-[url('/kuro.svg')] bg-no-repeat bg-[length:180px] bg-[top_1rem_left_1rem] min-h-screen">
      {/* Header */}
      <header className="mb-8 flex w-full max-w-4xl items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Benvenuto su GoLingo!
        </h1>
        <Link
          href="/profile"
          className="rounded-2xl border border-stone-200 bg-white/50 px-4 py-2 text-sm shadow-sm backdrop-blur transition hover:shadow-md"
        >
          Profilo
        </Link>
      </header>

      {/* Stat Grid */}
      <main className="grid w-full max-w-4xl grid-cols-1 sm:grid-cols-3 gap-6">
        {/* XP Card */}
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Star className="size-5" /> XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-3xl font-bold">{mockData.xp}</p>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
              <span
                style={{ width: `${progress}%` }}
                className="absolute left-0 top-0 h-full rounded-full bg-amber-400 transition-all"
              />
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Mancano {mockData.nextLevelXP - mockData.xp} XP al prossimo
              livello
            </p>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Flame className="size-5" /> Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-3xl font-bold">{mockData.streak} 🔥</p>
            <p className="text-sm text-stone-600">
              Continua a studiare per mantenere la serie!
            </p>
          </CardContent>
        </Card>

        {/* Daily Goal Card */}
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarCheck className="size-5" /> Obiettivo Giornaliero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-3xl font-bold">
              {mockData.dailyGoalCurrent}/{mockData.dailyGoalTarget}
            </p>
            <p className="text-sm text-stone-600">
              Completa {mockData.dailyGoalTarget - mockData.dailyGoalCurrent}{' '}
              lezioni per oggi
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Learning Path Placeholder */}
      <section className="mt-16 w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Percorso</h2>
          <Link
            href="/module/theory"
            className="rounded-xl border border-stone-200 bg-white/50 px-3 py-1.5 text-sm shadow-sm backdrop-blur transition hover:shadow-md"
          >
            Teoria ↗
          </Link>
        </header>

        <ol className="relative flex flex-col gap-10 pl-6 before:absolute before:left-[14px] before:top-1 before:h-[95%] before:w-[2px] before:bg-amber-300 dark:before:bg-amber-500">
          {pathLevels.map((level) => (
            <li key={level.id} className="relative flex items-center gap-4">
              {/* Nodo cerchio */}
              <span
                className={`absolute -left-6 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                  level.isReview ? 'bg-cyan-500' : 'bg-amber-400'
                }`}
              >
                {level.id}
              </span>

              {/* Titolo */}
              <span
                className={`text-lg font-medium mx-6 ${
                  level.isReview
                    ? 'italic text-cyan-600 dark:text-cyan-400'
                    : ''
                }`}
              >
                {level.name}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Footer */}
      <footer className="mt-auto flex w-full max-w-4xl items-center justify-between py-6 text-xs text-stone-500">
        <span>
          &copy; {new Date().getFullYear()} GoLingo • Tutti i diritti riservati
        </span>

        <a
          href="https://golingo.dev/feedback"
          className="hover:underline hover:underline-offset-4"
        >
          Feedback
        </a>
      </footer>
    </div>
  );
}
