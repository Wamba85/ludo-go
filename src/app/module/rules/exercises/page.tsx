'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Goban from '@/components/goban/goban';

const libertyExercises = [
  { answer: 4, choices: [5, 4, 8, 3] },
  { answer: 6, choices: [8, 4, 6, 10] },
  { answer: 3, choices: [3, 2, 4, 5] },
  { answer: 7, choices: [8, 7, 6, 9] },
  { answer: 2, choices: [4, 3, 1, 2] },
  { answer: 13, choices: [15, 13, 11, 17] },
  { answer: 8, choices: [8, 10, 12, 6] },
  { answer: 10, choices: [8, 12, 14, 10] },
  { answer: 5, choices: [3, 6, 5, 4] },
  { answer: 18, choices: [22, 18, 16, 20] },
];

const exercises = libertyExercises.map((item, idx) => ({
  id: idx + 1,
  title: `Esercizio ${idx + 1}`,
  question: 'Quante libertà ha questa catena di pietre?',
  description: 'Osserva la configurazione e scegli il numero corretto.',
  sgfPath: `/sgf/01_01_01_${String(idx + 1).padStart(2, '0')}.sgf`,
  ...item,
}));

export default function RulesExercisesPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  const currentExercise = exercises[currentIndex];
  const completedCount = completed ? exercises.length : currentIndex;
  const progressPercent = useMemo(
    () => Math.round((completedCount / exercises.length) * 100),
    [completedCount],
  );

  useEffect(() => {
    setSelectedOption(null);
    setIsAnswerCorrect(null);
  }, [currentIndex]);

  const handleOptionSelect = (value: number) => {
    if (completed || isAnswerCorrect === true) return;
    setSelectedOption(value);
    setIsAnswerCorrect(value === currentExercise.answer);
  };

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
    setSelectedOption(null);
    setIsAnswerCorrect(null);
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
            <h1 className="text-2xl font-semibold">
              Percorso esercizi – Libertà
            </h1>
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
              <div className="space-y-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-6 dark:border-amber-300/50 dark:bg-amber-900/10">
                <header className="text-center">
                  <h2 className="text-xl font-medium">
                    {currentExercise.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {currentExercise.description}
                  </p>
                  <p className="mt-4 text-base font-medium text-foreground">
                    {currentExercise.question}
                  </p>
                </header>
                <div className="flex justify-center">
                  <Goban
                    sgfMoves=""
                    BOARD_SIZE={9}
                    showMoveTree={false}
                    boardOnly
                    preloadSgfUrl={currentExercise.sgfPath}
                  />
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {currentExercise.choices.map((value) => {
                      const isSelected = selectedOption === value;
                      const isCorrectValue = value === currentExercise.answer;
                      const baseClass =
                        'rounded-full border px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400';
                      const className =
                        isAnswerCorrect === true && isCorrectValue
                          ? `${baseClass} border-emerald-500 bg-emerald-500 text-white shadow`
                          : isAnswerCorrect === true
                            ? `${baseClass} border-stone-200 bg-card/60 text-foreground/70 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300`
                            : isAnswerCorrect === false && isSelected
                              ? `${baseClass} border-rose-500 bg-rose-500 text-white shadow`
                              : isSelected
                                ? `${baseClass} border-amber-400 bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-900/20 dark:text-amber-200`
                                : `${baseClass} border-stone-200 bg-card/80 text-foreground transition hover:border-amber-400 hover:shadow-sm dark:border-stone-700 dark:bg-stone-900/60`;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleOptionSelect(value)}
                          className={className}
                          disabled={isAnswerCorrect === true}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                  {isAnswerCorrect === true && (
                    <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Corretto! Questa catena ha {currentExercise.answer}{' '}
                      libertà.
                    </p>
                  )}
                  {isAnswerCorrect === false && selectedOption !== null && (
                    <p className="text-center text-sm font-medium text-rose-600 dark:text-rose-400">
                      Non è corretto, conta di nuovo le libertà disponibili.
                    </p>
                  )}
                </div>
                <div className="text-center">
                  {isAnswerCorrect === true ? (
                    <button
                      onClick={handleComplete}
                      className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2 text-sm font-medium text-white shadow transition hover:scale-[1.02]"
                    >
                      {currentIndex === exercises.length - 1
                        ? 'Completa il percorso'
                        : 'Prossimo esercizio'}
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {selectedOption === null
                        ? 'Seleziona una risposta per continuare.'
                        : 'Riprova: serve la risposta corretta per passare al prossimo esercizio.'}
                    </p>
                  )}
                </div>
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
