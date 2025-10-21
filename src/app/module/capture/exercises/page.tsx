'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import Goban from '@/components/goban/goban';

type CaptureExercise = {
  id: number;
  title: string;
  description: string;
  sgfPath: string;
  prompt: string;
  progressMessage: string;
  successMessage: string;
  errorMessage: string;
};

const exercises: CaptureExercise[] = [
  {
    id: 1,
    title: 'Cattura centrale rapida',
    description: 'Riduci le libertà e chiudi la presa in due mosse nere.',
    sgfPath: '/sgf/01_01_02_01.sgf',
    prompt:
      'Gioca la mossa di apertura nera per mettere la pietra bianca al centro in atari.',
    progressMessage: 'Ottimo! Prosegui fino a togliere l’ultima libertà.',
    successMessage:
      'Sequenza completata: la pietra bianca centrale è catturata.',
    errorMessage:
      'Mossa errata: individua la libertà corretta da chiudere per completare l’atari.',
  },
  {
    id: 2,
    title: 'Doppio atari',
    description:
      'Chiudi entrambe le libertà residue della pietra bianca rimasta isolata.',
    sgfPath: '/sgf/01_01_02_02.sgf',
    prompt: 'Blocca la libertà più ovvia e prepara la mossa finale.',
    progressMessage: 'Ben fatto. Manca solo l’ultima libertà da togliere.',
    successMessage: 'Cattura completata! La pietra bianca non ha più libertà.',
    errorMessage:
      'Non è la casella giusta. Conta le libertà e richiudi quella mancante.',
  },
  {
    id: 3,
    title: 'Cattura sul lato destro',
    description:
      'Sfrutta il vantaggio posizionale per chiudere la pietra bianca sul lato destro.',
    sgfPath: '/sgf/01_01_02_03.sgf',
    prompt: 'Gioca al punto chiave per entrare in atari.',
    progressMessage: 'Ottimo! Completa ora la cattura.',
    successMessage: 'Perfetto: nessuna libertà rimasta per la pietra bianca.',
    errorMessage:
      'Quella mossa non chiude le libertà giuste. Ricontrolla la forma.',
  },
  {
    id: 4,
    title: 'Angolo superiore',
    description: 'Gestisci l’angolo mettendo pressione sulla pietra bianca.',
    sgfPath: '/sgf/01_01_02_04.sgf',
    prompt: 'Gioca il primo atari e resta pronto a chiudere l’angolo.',
    progressMessage: 'La pietra è in atari: procedi alla cattura.',
    successMessage: 'Angolo assicurato! La pietra bianca è fuori dal goban.',
    errorMessage:
      "Mossa sbagliata: nell'angolo serve precisione, individua la libertà corretta.",
  },
  {
    id: 5,
    title: 'Angolo inferiore',
    description:
      'Ripeti l’esercizio di cattura in angolo, questa volta sul lato inferiore.',
    sgfPath: '/sgf/01_01_02_05.sgf',
    prompt: 'Fissa l’atari iniziale per l’angolo basso.',
    progressMessage: 'Manca solo l’ultima libertà da chiudere.',
    successMessage: 'Ottimo lavoro: hai catturato anche questa pietra.',
    errorMessage:
      'Non lasciare scappare la pietra: richiudi esattamente il punto corretto.',
  },
  {
    id: 6,
    title: 'Atari immediato',
    description:
      'Individua subito il punto critico per mettere in atari la pietra bianca isolata.',
    sgfPath: '/sgf/01_01_02_06.sgf',
    prompt: 'Chiudi l’unica libertà rimasta alla pietra bianca.',
    progressMessage: 'Ben fatto! La pietra non ha più spazio per fuggire.',
    successMessage: 'Cattura completata con una sola mossa precisa.',
    errorMessage:
      'Quella mossa non chiude la libertà giusta. Controlla ancora il gruppo.',
  },
  {
    id: 7,
    title: 'Corsa nella zona centrale',
    description:
      'Segui la sequenza corretta per intrappolare il gruppo bianco che tenta di scappare.',
    sgfPath: '/sgf/01_01_02_07.sgf',
    prompt:
      'Gioca la prima mossa chiave, poi segui con precisione la sequenza.',
    progressMessage: 'Continua a chiudere le libertà una dopo l’altra.',
    successMessage:
      'Grande lavoro! Il gruppo bianco è completamente catturato.',
    errorMessage:
      'Sequenza interrotta: prova a contare tutte le libertà rimaste al gruppo bianco.',
  },
  {
    id: 8,
    title: 'Riduzione progressiva',
    description:
      'Riduci l’area di influenza bianca fino a completare la cattura sul lato sinistro.',
    sgfPath: '/sgf/01_01_02_08.sgf',
    prompt: 'Chiudi la libertà cruciale per entrare in atari.',
    progressMessage:
      'Ottimo blocco! Ora completa la sequenza fino alla cattura.',
    successMessage: 'Sequenza conclusa: il gruppo bianco è stato eliminato.',
    errorMessage:
      'Non è la libertà corretta: riprova a stringere con la mossa giusta.',
  },
  {
    id: 9,
    title: 'Cattura in profondità',
    description:
      'Una sequenza più lunga: segui le mosse nere fino a togliere tutte le libertà.',
    sgfPath: '/sgf/01_01_02_09.sgf',
    prompt: 'Gioca con calma: il primo atari guida tutta la sequenza.',
    progressMessage:
      'Continua così! Il gruppo bianco sta esaurendo le libertà.',
    successMessage: 'Perfetto! Hai completato una cattura lunga e precisa.',
    errorMessage:
      'Sequenza interrotta: ricontrolla tutte le libertà residue del gruppo bianco.',
  },
  {
    id: 10,
    title: 'Due varianti possibili',
    description:
      'Scegli la sequenza corretta per catturare il gruppo, tenendo conto delle risposte bianche.',
    sgfPath: '/sgf/01_01_02_10.sgf',
    prompt:
      'Avvia l’atari giusto: da qui si diramano due continuazioni possibili.',
    progressMessage: 'Ottimo! Continua a seguire la variante principale.',
    successMessage:
      'Sequenza completata! Hai gestito correttamente tutte le risposte bianche.',
    errorMessage:
      'La risposta scelta non chiude le libertà corrette. Torna indietro e riprova.',
  },
];

type Status = 'idle' | 'progress' | 'error' | 'done';

export default function CaptureExercisesPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [feedback, setFeedback] = useState(exercises[0].prompt);
  const [playedMoves, setPlayedMoves] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [revision, setRevision] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentExercise = exercises[currentIndex];

  useEffect(() => {
    setStatus('idle');
    setFeedback(currentExercise.prompt);
    setPlayedMoves(0);
    setTotalMoves(0);
  }, [currentExercise]);

  const progressPercent = useMemo(() => {
    if (completed) return 100;
    const doneCount = currentIndex + (status === 'done' ? 1 : 0);
    return Math.round((doneCount / exercises.length) * 100);
  }, [completed, currentIndex, status]);

  const handleWrongMove = () => {
    setStatus('error');
    setFeedback(currentExercise.errorMessage);
  };

  const handleAdvance = (played: number, total: number) => {
    setPlayedMoves(played);
    setTotalMoves(total);
    if (played >= total) {
      setStatus('done');
      setFeedback(currentExercise.successMessage);
    } else {
      setStatus('progress');
      setFeedback(currentExercise.progressMessage);
    }
  };

  const handleComplete = () => {
    setStatus('done');
    setFeedback(currentExercise.successMessage);
  };

  const handleNext = () => {
    if (currentIndex === exercises.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((idx) => {
      const next = idx + 1;
      setStatus('idle');
      setFeedback(exercises[next].prompt);
      setPlayedMoves(0);
      setTotalMoves(0);
      return next;
    });
  };

  const handleReset = () => {
    setRevision((rev) => rev + 1);
    setStatus('idle');
    setFeedback(currentExercise.prompt);
    setPlayedMoves(0);
    setTotalMoves(0);
  };

  const handleRestartAll = () => {
    setCompleted(false);
    setCurrentIndex(0);
    setStatus('idle');
    setFeedback(exercises[0].prompt);
    setPlayedMoves(0);
    setTotalMoves(0);
    setRevision((rev) => rev + 1);
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
            Torna al modulo regole
          </Link>
          <span className="text-xs text-muted-foreground">
            {completed
              ? `${exercises.length}/${exercises.length}`
              : `${currentIndex + 1}/${exercises.length}`}
          </span>
        </header>

        <section className="rounded-3xl border bg-card/70 p-6 shadow-sm backdrop-blur">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">
              Percorso esercizi – Modulo 2
            </h1>
            <p className="text-sm text-muted-foreground">
              Cattura le pietre seguendo la sequenza corretta. Dopo ogni mossa
              nera corretta, il Goban giocherà automaticamente la risposta
              bianca.
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
                <header className="space-y-2 text-center">
                  <h2 className="text-xl font-medium">
                    {currentExercise.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {currentExercise.description}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      status === 'error'
                        ? 'text-rose-600 dark:text-rose-400'
                        : status === 'done'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                    }`}
                  >
                    {feedback}
                  </p>
                </header>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    Mosse eseguite:{' '}
                    {totalMoves > 0
                      ? `${Math.min(playedMoves, totalMoves)}/${totalMoves}`
                      : '0/—'}
                  </span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-foreground transition hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                  >
                    <RotateCcw className="size-3" />
                    Resetta esercizio
                  </button>
                </div>

                <div className="flex justify-center">
                  <Goban
                    key={`${currentExercise.id}-${revision}`}
                    sgfMoves=""
                    BOARD_SIZE={9}
                    showMoveTree={false}
                    boardOnly
                    preloadSgfUrl={currentExercise.sgfPath}
                    guidedSequence={{
                      autoPlayOpponent: true,
                      userColor: 1,
                      onWrongMove: handleWrongMove,
                      onAdvanceStep: handleAdvance,
                      onComplete: handleComplete,
                    }}
                  />
                </div>

                <div className="text-center">
                  {status === 'done' ? (
                    <button
                      onClick={handleNext}
                      className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2 text-sm font-medium text-white shadow transition hover:scale-[1.02]"
                    >
                      {currentIndex === exercises.length - 1
                        ? 'Completa il percorso'
                        : 'Prossimo esercizio'}
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Gioca le mosse nere indicate dalla sequenza per avanzare.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 shadow-sm dark:border-emerald-400/60 dark:bg-emerald-900/20 dark:text-emerald-200">
                <CheckCircle2 className="size-5" />
                <span>
                  Hai completato tutti gli esercizi di cattura del modulo 2!
                </span>
              </div>
              <button
                onClick={handleRestartAll}
                className="inline-flex items-center justify-center rounded-full border border-stone-200 px-5 py-2 text-sm font-medium transition hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
              >
                Ricomincia percorso
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {exercises.map((exercise, idx) => {
              const isCompleted =
                completed ||
                idx < currentIndex ||
                (idx === currentIndex && status === 'done');
              const isActive =
                idx === currentIndex && !completed && status !== 'done';
              const indicatorClass = isCompleted
                ? 'bg-emerald-400 dark:bg-emerald-500'
                : isActive
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
