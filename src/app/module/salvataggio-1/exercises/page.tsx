'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import Goban from '@/components/goban/goban';
import { loadSgfToMoveTree } from '@/lib/sgf/moveNode-adapter';
import type { Label, LabelKind, MoveNode } from '@/types/goban';

type Status = 'idle' | 'progress' | 'error' | 'done';

const exercises = Array.from({ length: 10 }, (_, idx) => ({
  id: idx + 1,
  title: `Esercizio ${idx + 1}`,
  sgfPath: `/sgf/01_01_03_${String(idx + 1).padStart(2, '0')}.sgf`,
}));

const YES_PATTERN = /\bsi\b/i;
const NO_PATTERN = /\bno\b/i;

const toPointLabel = (kind: LabelKind, pt: string): Label | null => {
  if (!pt || pt.length < 2) return null;
  return {
    r: pt.charCodeAt(1) - 97,
    c: pt.charCodeAt(0) - 97,
    kind,
  };
};

const buildLabels = (extras: Record<string, string[]>): Label[] => {
  const toLabels = (kind: LabelKind, pts?: string[]) =>
    (pts ?? []).flatMap((pt) => {
      const label = toPointLabel(kind, pt);
      return label ? [label] : [];
    });

  const shapes = [
    ...toLabels('TR', extras.TR),
    ...toLabels('SQ', extras.SQ),
    ...toLabels('CR', extras.CR),
    ...toLabels('MA', extras.MA),
  ];

  const texts = (extras.LB ?? []).flatMap((entry) => {
    const [pt, text] = entry.split(':');
    if (!pt || !text) return [];
    const base = toPointLabel('LB', pt);
    return base ? [{ ...base, text }] : [];
  });

  return [...shapes, ...texts];
};

export default function SalvataggioExercisesPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [prompt, setPrompt] = useState('');
  const [labels, setLabels] = useState<Label[]>([]);
  const [sgfText, setSgfText] = useState('');
  const [playedMoves, setPlayedMoves] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [completed, setCompleted] = useState(false);
  const sgfRootRef = useRef<MoveNode | null>(null);
  const sgfCursorRef = useRef<MoveNode | null>(null);

  const currentExercise = exercises[currentIndex];

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    setPrompt('');
    setLabels([]);
    setSgfText('');
    setPlayedMoves(0);
    setStatus('idle');
    sgfRootRef.current = null;
    sgfCursorRef.current = null;

    fetch(currentExercise.sgfPath)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!active) return;
        const { meta, root } = loadSgfToMoveTree(text);
        const extras = (meta.extras ?? {}) as Record<string, string[]>;
        setLabels(buildLabels(extras));
        setPrompt(
          root.comment?.trim() ||
            'Salva le pietre marcate con la mossa corretta.',
        );
        sgfRootRef.current = root;
        sgfCursorRef.current = root;
        setSgfText(text);
      })
      .catch((err) => {
        if (!active) return;
        console.error(
          `[Salvataggio] Impossibile caricare ${currentExercise.sgfPath}`,
          err,
        );
        setLoadError('Impossibile caricare questo esercizio.');
        setPrompt('Caricamento non riuscito per questo esercizio.');
        sgfRootRef.current = null;
        sgfCursorRef.current = null;
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentExercise.sgfPath]);

  const progressPercent = useMemo(() => {
    if (completed) return 100;
    const doneCount = currentIndex + (status === 'done' ? 1 : 0);
    return Math.round((doneCount / exercises.length) * 100);
  }, [completed, currentIndex, status]);

  const statusMessage = useMemo(() => {
    if (isLoading) return 'Caricamento esercizio...';
    if (loadError) return loadError;
    if (status === 'done') return 'Corretto! Le pietre sono salve.';
    if (status === 'progress')
      return 'Continua la sequenza per salvare il gruppo.';
    if (status === 'error') return 'Non e la mossa giusta. Riprova.';
    return 'Seleziona la mossa che salva il gruppo.';
  }, [isLoading, loadError, status]);

  const statusTone = useMemo(() => {
    if (loadError) return 'text-rose-600 dark:text-rose-400';
    if (status === 'done') return 'text-emerald-600 dark:text-emerald-400';
    if (status === 'error') return 'text-rose-600 dark:text-rose-400';
    return 'text-foreground';
  }, [loadError, status]);

  const isBoardLocked =
    completed ||
    isLoading ||
    Boolean(loadError) ||
    !sgfText ||
    status === 'done';

  const handleBoardClick = (r: number, c: number) => {
    if (isBoardLocked) return true;
    const root = sgfRootRef.current;
    const cursor = sgfCursorRef.current;
    if (!root || !cursor) return true;

    const nextPlayer =
      cursor === root
        ? (root.children[0]?.player ?? 1)
        : cursor.player === 1
          ? 2
          : 1;
    const nextNode = cursor.children.find(
      (child) =>
        child.row === r && child.col === c && child.player === nextPlayer,
    );

    if (!nextNode) {
      setStatus('error');
      return true;
    }

    let autoNode: MoveNode | null = null;
    let cursorNode = nextNode;
    let next = cursorNode.children[0];
    while (next && next.player !== nextNode.player) {
      autoNode = next;
      cursorNode = next;
      next = cursorNode.children[0];
    }
    sgfCursorRef.current = autoNode ?? nextNode;
    setPlayedMoves((count) => count + 1);

    const userComment = nextNode.comment ?? '';
    if (YES_PATTERN.test(userComment)) {
      setStatus('done');
      return false;
    }
    if (NO_PATTERN.test(userComment)) {
      setStatus('error');
      return false;
    }
    if (autoNode?.comment && NO_PATTERN.test(autoNode.comment)) {
      setStatus('error');
      return false;
    }
    if (!autoNode) {
      setStatus('done');
    } else {
      setStatus('progress');
    }

    return false;
  };

  const handleNext = () => {
    if (currentIndex === exercises.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((idx) => idx + 1);
    setPlayedMoves(0);
  };

  const handleReset = () => {
    setRevision((rev) => rev + 1);
    setStatus('idle');
    setPlayedMoves(0);
    sgfCursorRef.current = sgfRootRef.current;
  };

  const handleRestartAll = () => {
    setCompleted(false);
    setCurrentIndex(0);
    setStatus('idle');
    setPlayedMoves(0);
    setRevision((rev) => rev + 1);
    sgfCursorRef.current = sgfRootRef.current;
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Torna alla dashboard
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
              Percorso esercizi - Salvataggio 1
            </h1>
            <p className="text-sm text-muted-foreground">
              Salva le pietre marcate scegliendo la mossa corretta.
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
                    {prompt || 'Salva le pietre marcate.'}
                  </p>
                  <p className={`text-sm font-medium ${statusTone}`}>
                    {statusMessage}
                  </p>
                </header>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Mosse eseguite: {playedMoves}</span>
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
                    sgfMoves={sgfText}
                    BOARD_SIZE={9}
                    showMoveTree={false}
                    boardOnly
                    labels={labels}
                    onBoardClick={handleBoardClick}
                    autoplay={Boolean(sgfText)}
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
                      Seleziona la mossa che salva il gruppo per avanzare.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 shadow-sm dark:border-emerald-400/60 dark:bg-emerald-900/20 dark:text-emerald-200">
                <CheckCircle2 className="size-5" />
                <span>Hai completato tutti gli esercizi di salvataggio 1!</span>
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
