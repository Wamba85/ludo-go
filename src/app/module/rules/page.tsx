'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Moon,
  SunMedium,
  Target,
  PlayCircle,
  Ban,
  Link2,
  Timer,
  CircleDot,
  ShieldPlus,
} from 'lucide-react';

// Learning page. Usiamo la board reale solo nella sezione "Turni e colori".
import GobanBoard from '@/components/goban/goban-board';
import { useGobanState } from '@/hooks/use-goban-state';

type SectionId =
  | 'turni'
  | 'intersezioni'
  | 'liberta-catene'
  | 'cattura'
  | 'ko'
  | 'mosse-illegali'
  | 'punteggio'
  | 'quiz';

const STORAGE_KEY = 'rules-progress-v1';

const interactiveSectionIds: SectionId[] = [
  'turni',
  'intersezioni',
  'liberta-catene',
  'cattura',
  'ko',
  'mosse-illegali',
  'punteggio',
  'quiz',
];

type ProgressMap = Record<SectionId, boolean>;

function useLocalProgress() {
  const [progress, setProgress] = useState<ProgressMap>(() => {
    if (typeof window === 'undefined') return initProgress();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return initProgress();
      const parsed = JSON.parse(raw) as Partial<ProgressMap>;
      return { ...initProgress(), ...parsed };
    } catch {
      return initProgress();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {}
  }, [progress]);

  const percent = useMemo(() => {
    const done = interactiveSectionIds.filter((id) => progress[id]).length;
    return Math.round((done / interactiveSectionIds.length) * 100);
  }, [progress]);

  return { progress, setProgress, percent } as const;
}

function initProgress(): ProgressMap {
  return interactiveSectionIds.reduce((acc, id) => {
    acc[id] = false;
    return acc;
  }, {} as ProgressMap);
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      aria-label="Progresso lezione"
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div
        className="h-full bg-amber-400 transition-[width] duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function DotNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav
      aria-label="Sezioni"
      className="pointer-events-auto fixed right-4 top-1/2 z-40 -translate-y-1/2"
    >
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className="block size-3 rounded-full bg-stone-300 ring-2 ring-stone-300 hover:bg-amber-400 focus:outline-none focus:ring-amber-400"
              title={it.label}
            >
              <span className="sr-only">{it.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Section({
  id,
  title,
  children,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="snap-start flex min-h-[100svh] w-full items-center justify-center px-4 py-16"
      aria-labelledby={`${id}-title`}
    >
      <div className="mx-auto w-full max-w-5xl rounded-3xl border bg-card/70 p-6 shadow-sm backdrop-blur">
        <header className="mb-6 flex flex-col gap-2">
          <h2 id={`${id}-title`} className="text-2xl font-semibold">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-muted-foreground">{subtitle}</p>
          ) : null}
        </header>
        {children}
      </div>
    </section>
  );
}

function BoardPlaceholder({ size = 9 }: { size?: number }) {
  // Non interattivo: semplice scacchiera a linee con fondo legno chiaro.
  const cells = Array.from({ length: size * size });
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px] rounded-xl bg-[linear-gradient(45deg,_#f5deb3_25%,_#f0d49e_25%,_#f0d49e_50%,_#f5deb3_50%,_#f5deb3_75%,_#f0d49e_75%,_#f0d49e_100%)] bg-[length:20px_20px] p-5 shadow-inner ring-1 ring-stone-300">
      <div
        className="absolute inset-5 grid"
        style={{
          gridTemplateColumns: `repeat(${size},1fr)`,
          gridTemplateRows: `repeat(${size},1fr)`,
        }}
      >
        {cells.map((_, i) => (
          <div key={i} className="relative">
            {/* linee */}
            <div className="pointer-events-none absolute inset-0 border border-stone-400/40" />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-2 text-center text-xs text-stone-700/80">
        Placeholder board 9×9 – interattivo disabilitato
      </div>
    </div>
  );
}

function IntersectionGrid({
  size = 5,
  targets = [12, 18],
  onHit,
  onMiss,
}: {
  size?: number;
  targets?: number[]; // indices of intersection buttons
  onHit?: () => void;
  onMiss?: () => void;
}) {
  const total = size * size;
  const indices = Array.from({ length: total }, (_, i) => i);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current) onMiss?.();
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="relative mx-auto aspect-square w-full max-w-[360px] select-none rounded-xl bg-amber-100/50 p-4 ring-1 ring-stone-300"
    >
      {/* Grid lines */}
      <div
        className="absolute inset-4 grid"
        style={{
          gridTemplateColumns: `repeat(${size},1fr)`,
          gridTemplateRows: `repeat(${size},1fr)`,
        }}
      >
        {indices.map((i) => (
          <div key={i} className="relative">
            <div className="pointer-events-none absolute inset-0 border border-stone-300" />
          </div>
        ))}
      </div>
      {/* Intersections */}
      <div
        className="absolute inset-4 grid place-items-center"
        style={{
          gridTemplateColumns: `repeat(${size},1fr)`,
          gridTemplateRows: `repeat(${size},1fr)`,
        }}
      >
        {indices.map((i) => {
          const isTarget = targets.includes(i);
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onHit?.();
              }}
              className={`size-3 rounded-full transition ${
                isTarget
                  ? 'animate-pulse bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.3)]'
                  : 'bg-stone-400'
              }`}
              aria-label={isTarget ? 'Intersezione obiettivo' : 'Intersezione'}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function RulesPage() {
  const { percent, progress, setProgress } = useLocalProgress();
  const [ariaMsg, setAriaMsg] = useState('');
  const [themeDark, setThemeDark] = useState(false);

  useEffect(() => {
    // restore theme from document
    const hasDark = document.documentElement.classList.contains('dark');
    setThemeDark(hasDark);
  }, []);

  const setDone = (id: SectionId, done = true) => {
    setProgress((prev) => (prev[id] === done ? prev : { ...prev, [id]: done }));
  };

  const announce = (msg: string) => {
    setAriaMsg('');
    // flush then set, to ensure live region fires
    requestAnimationFrame(() => setAriaMsg(msg));
  };

  const toggleTheme = () => {
    const el = document.documentElement;
    if (el.classList.contains('dark')) {
      el.classList.remove('dark');
      setThemeDark(false);
      announce('Tema chiaro attivato');
    } else {
      el.classList.add('dark');
      setThemeDark(true);
      announce('Tema scuro attivato');
    }
  };

  // Local UI states for demos
  // Stato sezione "Turni e colori"
  const [firstPlayer, setFirstPlayer] = useState<1 | 2>(1); // 1=nero, 2=bianco
  const [firstMove, setFirstMove] = useState<1 | 2 | null>(null);
  const [firstMoveLocked, setFirstMoveLocked] = useState(false);
  const [boardDisabled, setBoardDisabled] = useState(false);
  const [resetSeed, setResetSeed] = useState(0);
  const skipNextOnAfterPlayRef = useRef(false);
  const [intersectionsOk, setIntersectionsOk] = useState(false);
  const [intersectionsErr, setIntersectionsErr] = useState(false);
  const [libertyChoice, setLibertyChoice] = useState<number | null>(null);
  const [prisonersBlack, setPrisonersBlack] = useState(0);
  const [koAltrove, setKoAltrove] = useState(false);
  const [illegalTried, setIllegalTried] = useState(false);
  const [illegalThenLegal, setIllegalThenLegal] = useState(false);
  const [territoryB, setTerritoryB] = useState(0);
  const [territoryW, setTerritoryW] = useState(0);
  const [komi, setKomi] = useState<6.5 | 7.5>(6.5);

  // Quiz state
  type Q = {
    id: string;
    text: string;
    options: {
      key: string;
      label: string;
      correct?: boolean;
      explain?: string;
    }[];
    diagram?: string[]; // 5 rows string
  };
  const quiz: Q[] = [
    {
      id: 'q1',
      text: 'Chi muove per primo?',
      options: [
        {
          key: 'a',
          label: 'Nero',
          correct: true,
          explain: 'Per regola standard, muove Nero.',
        },
        { key: 'b', label: 'Bianco', explain: 'Nel Go standard muove Nero.' },
        {
          key: 'c',
          label: 'Indifferente',
          explain: "C'è un ordine: prima Nero.",
        },
      ],
    },
    {
      id: 'q2',
      text: 'Dove si gioca la pietra?',
      options: [
        {
          key: 'a',
          label: 'Sulle intersezioni',
          correct: true,
          explain: 'A croce, non dentro le caselle.',
        },
        {
          key: 'b',
          label: 'Dentro le caselle',
          explain: 'Nel Go si usano le intersezioni.',
        },
        {
          key: 'c',
          label: 'Solo ai bordi',
          explain: 'Si può ovunque, sulle intersezioni.',
        },
      ],
    },
    {
      id: 'q3',
      text: 'Quante libertà ha una pietra al centro (5×5)?',
      diagram: [
        '. . . . .',
        '. . . . .',
        '. . B . .',
        '. . . . .',
        '. . . . .',
      ],
      options: [
        {
          key: 'a',
          label: '4',
          correct: true,
          explain: 'Centro ha 4 vicini ortogonali.',
        },
        {
          key: 'b',
          label: '3',
          explain: 'Solo agli angoli sono 2/3, non al centro.',
        },
        { key: 'c', label: '2', explain: 'Centro non ha solo 2 libertà.' },
      ],
    },
    {
      id: 'q4',
      text: 'Qual è la mossa che cattura?',
      diagram: [
        '. W W . .',
        '. W . . .',
        '. W X . .',
        '. . . . .',
        '. . . . .',
      ],
      options: [
        {
          key: 'a',
          label: 'X',
          correct: true,
          explain: 'Chiude l’ultima libertà della catena bianca.',
        },
        {
          key: 'b',
          label: 'Un punto qualsiasi',
          explain: 'Solo X completa la cattura.',
        },
        { key: 'c', label: 'Passare', explain: 'Passare non cattura.' },
      ],
    },
    {
      id: 'q5',
      text: 'Dopo un ko, puoi ricatturare subito?',
      options: [
        {
          key: 'a',
          label: 'No',
          correct: true,
          explain: 'Devi giocare altrove un turno.',
        },
        {
          key: 'b',
          label: 'Sì',
          explain: 'Ko vieta la ripetizione immediata.',
        },
      ],
    },
  ];

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seenFeedback, setSeenFeedback] = useState<Record<string, string>>({});
  const allCorrect = useMemo(
    () =>
      quiz.every(
        (q) => q.options.find((o) => o.correct)?.key === answers[q.id],
      ),
    [answers],
  );

  useEffect(() => {
    if (allCorrect) {
      setDone('quiz', true);
      announce('Quiz completato correttamente');
    }
  }, [allCorrect]);

  const navItems = [
    { id: 'hero', label: 'Hero' },
    { id: 'turni', label: 'Turni' },
    { id: 'intersezioni', label: 'Intersezioni' },
    { id: 'liberta-catene', label: 'Libertà' },
    { id: 'cattura', label: 'Cattura' },
    { id: 'ko', label: 'Ko' },
    { id: 'mosse-illegali', label: 'Illegali' },
    { id: 'punteggio', label: 'Punteggio' },
    { id: 'quiz', label: 'Quiz' },
  ];

  const liveRef = useRef<HTMLDivElement>(null);

  // Hook goban per la sezione "Turni e colori" (board 9x9)
  const rulesSetup = useMemo(
    () => ({ size: 9, stones: [], toPlay: firstPlayer }),
    [firstPlayer],
  );
  const rulesGoban = useGobanState(String(resetSeed), 9, {
    setup: rulesSetup,
    onAfterPlay: ({ lastMove, currentNode }) => {
      if (skipNextOnAfterPlayRef.current) {
        skipNextOnAfterPlayRef.current = false;
        return;
      }
      // Solo la primissima mossa
      if (!lastMove) return;
      if (!firstMoveLocked && currentNode.depth === 0) {
        setFirstMove(lastMove.player);
        setFirstMoveLocked(true);
        if (lastMove.player === 1) {
          setDone('turni', true);
          announce('Corretto: Nero muove per primo');
        } else announce('Ops: hai mosso Bianco per primo');
        setBoardDisabled(true);
      }
    },
  });

  const resetTurni = () => {
    // Reinizializza la board e sblocca la scelta
    skipNextOnAfterPlayRef.current = true; // ignora il callback dell'effetto di replay
    setBoardDisabled(false);
    setFirstMove(null);
    setFirstMoveLocked(false);
    setFirstPlayer(1);
    announce('Ripristinato: prova di nuovo con Nero');
    // attiva per ultima cosa il reset della board
    setResetSeed((s) => s + 1);
  };

  return (
    <div className="relative min-h-[100svh] bg-gradient-to-b from-white to-amber-50 dark:from-zinc-950 dark:to-zinc-900">
      {/* Sticky header */}
      <header className="pointer-events-none sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
        <div className="pointer-events-auto mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-lg border bg-card px-2 py-1 text-sm shadow-sm hover:shadow"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <a
              href="#quiz"
              className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-sm font-medium text-white shadow hover:scale-[1.02]"
            >
              <PlayCircle className="size-4" /> Quiz
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex size-9 items-center justify-center rounded-lg border bg-card text-foreground shadow-sm hover:shadow"
              aria-label={
                themeDark ? 'Attiva tema chiaro' : 'Attiva tema scuro'
              }
              title={themeDark ? 'Tema chiaro' : 'Tema scuro'}
            >
              {themeDark ? (
                <SunMedium className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <ProgressBar value={percent} />
        </div>
      </header>

      {/* Live region for accessibility */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        ref={liveRef}
      >
        {ariaMsg}
      </div>

      {/* Dot breadcrumb nav */}
      <DotNav items={navItems} />

      {/* Scroll-snap container */}
      <main className="snap-y snap-mandatory">
        {/* Hero */}
        <section
          id="hero"
          className="snap-start flex min-h-[100svh] items-center justify-center px-4 py-16"
        >
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col justify-center gap-4">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Impara le regole
              </h1>
              <p className="text-muted-foreground">
                Le basi del Go in 3 minuti: interazioni semplici, feedback
                immediato.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="#turni"
                  className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-white shadow hover:scale-[1.02]"
                >
                  <PlayCircle className="size-5" /> Impara in 3 minuti
                </a>
                <a
                  href="#quiz"
                  className="inline-flex items-center gap-2 rounded-full border bg-card px-5 py-3 shadow hover:shadow-md"
                >
                  <Target className="size-5" /> Prova il quiz
                </a>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Barra di progresso salvata in locale.
              </div>
            </div>
            <div>
              <BoardPlaceholder size={9} />
              <div className="mt-2 text-center text-sm text-muted-foreground">
                Pietra fantasma quando passi sopra. Libertà evidenziate come
                puntini.
              </div>
            </div>
          </div>
        </section>

        {/* 1. Turni e colori */}
        <Section
          id="turni"
          title="Turni e colori"
          subtitle="Nero muove per primo. Scegli il colore della prima mossa e poi gioca sul goban."
        >
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[auto_1fr]">
            {/* Goban 9x9 a sinistra */}
            <div className="flex items-center justify-center">
              <div
                className={`relative rounded-xl border bg-card p-2 w-full max-w-[480px] ${boardDisabled ? 'opacity-80' : ''}`}
              >
                <GobanBoard
                  board={rulesGoban.board}
                  currentNode={rulesGoban.currentNode}
                  root={rulesGoban.root}
                  koPoint={rulesGoban.koPoint}
                  showLiberties={false}
                  showCoordinates={true}
                  onIntersectionClick={(r, c) => {
                    if (boardDisabled) return;
                    rulesGoban.handleIntersectionClick(r, c);
                  }}
                />
                {boardDisabled && (
                  <div className="pointer-events-none absolute inset-0 rounded-lg" />
                )}
              </div>
            </div>

            {/* Testo + controlli a destra */}
            <div className="flex flex-col gap-3">
              <div className="text-sm text-muted-foreground">
                Seleziona solo il colore della <strong>prima</strong> mossa, poi
                clicca un punto sul goban. Feedback positivo se inizi con Nero.
              </div>
              <div className="flex items-center gap-3">
                <button
                  className={`rounded-full px-4 py-2 text-white shadow ${
                    firstPlayer === 1 ? 'bg-stone-900' : 'bg-stone-400'
                  } ${firstMoveLocked ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                  disabled={firstMoveLocked}
                  onClick={() => {
                    if (firstMoveLocked) return;
                    setFirstPlayer(1);
                    announce('Prima mossa impostata: Nero');
                  }}
                >
                  Gioca Nero
                </button>
                <button
                  className={`rounded-full px-4 py-2 text-white shadow ${
                    firstPlayer === 2 ? 'bg-amber-600' : 'bg-stone-400'
                  } ${firstMoveLocked ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                  disabled={firstMoveLocked}
                  onClick={() => {
                    if (firstMoveLocked) return;
                    setFirstPlayer(2);
                    announce('Prima mossa impostata: Bianco');
                  }}
                >
                  Gioca Bianco
                </button>
              </div>

              {/* Feedback dopo la prima mossa */}
              {firstMove !== null &&
                (firstMove === 1 ? (
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                    <CheckCircle2 className="size-4" /> corretto: Nero per primo
                  </span>
                ) : boardDisabled ? (
                  <div className="inline-flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                    <span className="size-2 rounded-full bg-red-500" />
                    Errato: hai iniziato con Bianco. Muove Nero per primo.
                    <button
                      className="ml-1 rounded-full bg-red-600 px-3 py-1 text-white shadow hover:scale-[1.02]"
                      onClick={resetTurni}
                    >
                      Ripristina e riprova
                    </button>
                  </div>
                ) : null)}
            </div>
          </div>
        </Section>

        {/* 2. Intersezioni, non caselle */}
        <Section
          id="intersezioni"
          title="Intersezioni, non caselle"
          subtitle="Si gioca sulle intersezioni, non dentro le caselle."
        >
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[360px_1fr]">
            <IntersectionGrid
              size={5}
              targets={[7, 17]}
              onHit={() => {
                setIntersectionsOk(true);
                setIntersectionsErr(false);
                setDone('intersezioni', true);
                announce('Clic corretto su intersezione');
              }}
              onMiss={() => {
                setIntersectionsErr(true);
                announce('Clicca sull’intersezione, non nella casella');
              }}
            />
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Prova a cliccare sulle intersezioni che lampeggiano. Un clic
                sulla casella non è valido.
              </p>
              {intersectionsOk && (
                <div className="inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="size-4" /> corretto: intersezione
                  selezionata
                </div>
              )}
              {intersectionsErr && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  <span className="size-2 rounded-full bg-red-500" />
                  Errore morbido: tocca un’intersezione, non la casella.
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* 3. Libertà e catene */}
        <Section
          id="liberta-catene"
          title="Libertà e catene"
          subtitle="Ogni pietra ha libertà. Le catene condividono le libertà."
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="mb-2 text-sm text-muted-foreground">
                Scegli il punto dove la pietra resterà con 2 libertà.
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setLibertyChoice(n);
                      const ok = n === 2;
                      if (ok) {
                        setDone('liberta-catene', true);
                        announce('Scelta corretta: 2 libertà');
                      } else {
                        announce(`Questa ne ha ${n}`);
                      }
                    }}
                    className={`rounded-xl border px-4 py-6 text-center text-lg font-semibold shadow-sm transition ${
                      libertyChoice === n
                        ? n === 2
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-red-400 bg-red-50 text-red-700'
                        : 'hover:bg-muted'
                    }`}
                    aria-label={`Scegli punto con ${n} libertà`}
                    aria-pressed={libertyChoice === n}
                  >
                    Libertà = {n}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Catena: pietre collegate in orizzontale o verticale. Le libertà
                sono i piccoli punti adiacenti.
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {['.', 'B', '.', 'B', '.'].map((v, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg border ${v === 'B' ? 'bg-stone-900' : 'bg-white'}`}
                  />
                ))}
                <div className="col-span-5 text-muted-foreground">
                  Placeholder diagramma: le catene condividono le libertà.
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* 4. Cattura */}
        <Section
          id="cattura"
          title="Cattura"
          subtitle="Circondi tutte le libertà di una catena avversaria e la catturi."
        >
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto]">
            <div className="rounded-xl border p-4">
              <div className="mb-3 text-sm text-muted-foreground">
                Forma bianca con 1 libertà. Chiudi l’ultima libertà.
              </div>
              <button
                onClick={() => {
                  setPrisonersBlack((p) => p + 1);
                  setDone('cattura', true);
                  announce('Cattura effettuata. Prigionieri +1');
                }}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 font-medium text-white shadow hover:scale-[1.02]"
              >
                <ShieldPlus className="size-4" /> Chiudi l’ultima libertà
              </button>
              <div className="mt-3 text-sm">
                Prigionieri Nero:{' '}
                <span className="font-semibold">{prisonersBlack}</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Breve dissolvenza placeholder al momento della cattura.
            </div>
          </div>
        </Section>

        {/* 5. Ko */}
        <Section
          id="ko"
          title="Ko"
          subtitle="Vietata la ricattura immediata della stessa posizione."
        >
          <div className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground">
              Posizione di ko preimpostata. Per ricatturare devi prima giocare
              altrove.
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className={`rounded-full px-4 py-2 text-white shadow ${koAltrove ? 'bg-stone-900' : 'bg-stone-400 cursor-not-allowed'}`}
                disabled={!koAltrove}
                onClick={() => {
                  setDone('ko', true);
                  announce('Ricattura consentita: è passato un turno');
                }}
              >
                Prova a ricatturare
              </button>
              <button
                className="rounded-full bg-amber-500 px-4 py-2 text-white shadow hover:scale-[1.02]"
                onClick={() => {
                  setKoAltrove(true);
                  announce(
                    'Aspetta un turno, gioca altrove: ora puoi ricatturare',
                  );
                }}
              >
                Gioca altrove
              </button>
              {!koAltrove && (
                <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  <Ban className="size-4" /> Tooltip: aspetta un turno, gioca
                  altrove
                </span>
              )}
            </div>
          </div>
        </Section>

        {/* 6. Mosse illegali */}
        <Section
          id="mosse-illegali"
          title="Mosse illegali"
          subtitle="Suicidio vietato, tranne se catturi e liberi."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-full bg-red-600 px-4 py-2 text-white shadow hover:scale-[1.02]"
                onClick={() => {
                  setIllegalTried(true);
                  announce('Mossa illegale: punto senza libertà');
                }}
              >
                Prova mossa senza libertà
              </button>
              {illegalTried && (
                <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  <span className="size-2 rounded-full bg-red-500" />
                  Mossa illegale
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-full bg-emerald-600 px-4 py-2 text-white shadow hover:scale-[1.02]"
                onClick={() => {
                  setIllegalThenLegal(true);
                  setDone('mosse-illegali', true);
                  announce('Mossa legale: cattura che crea libertà');
                }}
              >
                Riprova: ora cattura e crea libertà
              </button>
              {illegalThenLegal && (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="size-4" /> legale: ora crea libertà
                </span>
              )}
            </div>
          </div>
        </Section>

        {/* 7. Fine partita e punteggio */}
        <Section
          id="punteggio"
          title="Fine partita e punteggio"
          subtitle="Conta territorio vuoto circondato più prigionieri. Bianco riceve komi."
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border p-4">
              <div className="mb-3 text-sm text-muted-foreground">
                Aree colorabili placeholder. Modifica i contatori per simulare
                il territorio.
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-lg border p-3">
                  <div className="mb-2 font-medium">Territorio Nero</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border px-3 py-1"
                      onClick={() => setTerritoryB((t) => Math.max(0, t - 1))}
                      aria-label="Diminuisci territorio Nero"
                    >
                      −
                    </button>
                    <div className="w-10 text-center text-lg font-semibold">
                      {territoryB}
                    </div>
                    <button
                      className="rounded-lg border px-3 py-1"
                      onClick={() => setTerritoryB((t) => t + 1)}
                      aria-label="Aumenta territorio Nero"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="mb-2 font-medium">Territorio Bianco</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border px-3 py-1"
                      onClick={() => setTerritoryW((t) => Math.max(0, t - 1))}
                      aria-label="Diminuisci territorio Bianco"
                    >
                      −
                    </button>
                    <div className="w-10 text-center text-lg font-semibold">
                      {territoryW}
                    </div>
                    <button
                      className="rounded-lg border px-3 py-1"
                      onClick={() => setTerritoryW((t) => t + 1)}
                      aria-label="Aumenta territorio Bianco"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="rounded-full border px-3 py-1 text-sm">
                  Komi:{' '}
                  <button
                    className="underline"
                    onClick={() => setKomi((k) => (k === 6.5 ? 7.5 : 6.5))}
                  >
                    {komi.toString().replace('.', ',')}
                  </button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Bianco riceve il komi come compensazione.
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setDone('punteggio', true);
                    announce('Conteggio aggiornato');
                  }}
                  className="rounded-full bg-stone-900 px-4 py-2 text-white shadow hover:scale-[1.02]"
                >
                  Aggiorna conteggio
                </button>
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="mb-2 font-medium">Totale live</div>
              <div className="text-sm text-muted-foreground">
                Somma: territorio + prigionieri. Bianco aggiunge komi.
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 text-lg">
                <div className="rounded-lg border p-3">
                  <div className="text-sm">Nero</div>
                  <div className="font-semibold">
                    {territoryB + prisonersBlack}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Territorio {territoryB} + Prigionieri {prisonersBlack}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm">Bianco</div>
                  <div className="font-semibold">{territoryW + komi}</div>
                  <div className="text-xs text-muted-foreground">
                    Territorio {territoryW} + Komi {komi}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* 8. Recap rapido + mini-quiz */}
        <Section
          id="quiz"
          title="Recap rapido"
          subtitle="Poi mettiamoci alla prova con 5 domande"
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            <RecapCard icon={<Timer className="size-5" />} title="Turni" />
            <RecapCard
              icon={<Target className="size-5" />}
              title="Intersezioni"
            />
            <RecapCard
              icon={<CircleDot className="size-5" />}
              title="Libertà"
            />
            <RecapCard icon={<Link2 className="size-5" />} title="Catene" />
            <RecapCard
              icon={<ShieldPlus className="size-5" />}
              title="Cattura"
            />
            <RecapCard icon={<Ban className="size-5" />} title="Ko" />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6">
            {quiz.map((q) => {
              const correctKey = q.options.find((o) => o.correct)?.key;
              const picked = answers[q.id];
              const isCorrect = picked && picked === correctKey;
              const feedback =
                picked && q.options.find((o) => o.key === picked)?.explain;

              return (
                <div key={q.id} className="rounded-2xl border p-4">
                  <div className="mb-2 text-base font-medium">{q.text}</div>
                  {q.diagram && (
                    <pre className="mb-3 rounded-lg bg-muted p-3 text-sm leading-6">
                      {q.diagram.map((r) => r).join('\n')}
                    </pre>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {q.options.map((opt) => (
                      <label
                        key={opt.key}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-sm transition ${
                          picked === opt.key
                            ? isCorrect
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-red-400 bg-red-50 text-red-700'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          className="sr-only"
                          checked={picked === opt.key}
                          onChange={() => {
                            setAnswers((a) => ({ ...a, [q.id]: opt.key }));
                            setSeenFeedback((s) => ({ ...s, [q.id]: opt.key }));
                            if (opt.correct) announce('Risposta corretta');
                            else announce('Risposta errata');
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {seenFeedback[q.id] && (
                    <div
                      className={`mt-2 text-sm ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}
                    >
                      {feedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {progress['quiz']
                ? 'Quiz completato!'
                : 'Rispondi a tutte per completare'}
            </div>
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 font-medium text-white shadow hover:scale-[1.02]"
            >
              Apri una board 9×9 e prova 10 mosse
            </Link>
          </div>
        </Section>
      </main>

      {/* Footer spacing */}
      <div className="h-8" />
    </div>
  );
}

function RecapCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm shadow-sm">
      <span className="text-amber-600">{icon}</span>
      <span className="font-medium">{title}</span>
    </div>
  );
}
