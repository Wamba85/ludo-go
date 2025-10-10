'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const exercises = Array.from({ length: 10 }, (_, idx) => ({
  id: idx + 1,
  title: `Esercizio ${idx + 1}`,
  description:
    'Placeholder interattivo. Qui verrà inserita la logica reale dell’esercizio.',
}));

export default function RulesExercisesPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentExercise = exercises[currentIndex];
  const completedCount = completed ? exercises.length : currentIndex;
  const progressPercent = useMemo(
    () => Math.round((completedCount / exercises.length) * 100),
    [completedCount],
  );

  const handleComplete = () => {
    if (currentIndex === exercises.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((idx) => Math.min(exercises.length - 1, idx + 1));
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setCompleted(false);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <Link
            href="/module/rules"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Torna alle regole
          </Link>
          <span className="text-xs text-muted-foreground">
            {Math.min(currentIndex + 1, exercises.length)} / {exercises.length}
          </span>
        </header>

        <section className="rounded-3xl border bg-card/70 p-6 shadow-sm backdrop-blur">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Percorso esercizi</h1>
            <p className="text-sm text-muted-foreground">
              Completa gli step in sequenza. Ogni placeholder verrà sostituito
              con un esercizio reale.
            </p>
          </div>

          <div className="mb-6">
            <div
              aria-label="Progresso percorso esercizi"
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <span
                className="block h-full bg-amber-400 transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Progresso: {progressPercent}%
            </p>
          </div>

          {!completed ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-6 text-center dark:border-amber-300/50 dark:bg-amber-900/10">
                <h2 className="text-xl font-medium">{currentExercise.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {currentExercise.description}
                </p>
                <button
                  onClick={handleComplete}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2 text-sm font-medium text-white shadow transition hover:scale-[1.02]"
                >
                  Completa esercizio
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 shadow-sm dark:border-emerald-400/60 dark:bg-emerald-900/20 dark:text-emerald-200">
                <CheckCircle2 className="size-5" />
                <span>Percorso completato! Ottimo lavoro.</span>
              </div>
              <button
                onClick={handleRestart}
                className="inline-flex items-center justify-center rounded-full border border-stone-200 px-5 py-2 text-sm font-medium transition hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                Ricomincia percorso
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {exercises.map((exercise, idx) => {
              const state = completed
                ? 'done'
                : idx < currentIndex
                  ? 'done'
                  : idx === currentIndex
                    ? 'active'
                    : 'idle';
              const indicatorClass =
                state === 'done'
                  ? 'bg-emerald-400 dark:bg-emerald-500'
                  : state === 'active'
                    ? 'bg-amber-400'
                    : 'bg-stone-300 dark:bg-stone-600';

              return (
                <span
                  key={exercise.id}
                  className={`size-3 rounded-full ${indicatorClass}`}
                  aria-hidden="true"
                />
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
