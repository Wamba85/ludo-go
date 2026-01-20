'use client';

import Goban from '@/components/goban/goban';
import MascotIdle from '@/components/mascot-idle';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { GoMeta } from '@/lib/sgf/go-semantic';
import type { Label, LabelKind } from '@/types/goban';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Rule = {
  id: number;
  title: string;
  description: string;
  img: string;
};

const RULES: ReadonlyArray<Rule> = [
  {
    id: 1,
    title: 'Libertà',
    description:
      'Ogni pietra ha libertà pari agli spazi vuoti ortogonali ad essa. Le catene condividono le libertà.',
    img: '/theory/liberties.svg',
  },
  {
    id: 2,
    title: 'Cattura',
    description:
      'Quando tutte le libertà di una catena avversaria vengono occupate, le pietre vengono rimosse dal goban.',
    img: '/theory/capture.svg',
  },
  {
    id: 3,
    title: 'Ko',
    description:
      'La regola del ko impedisce di ripetere subito una posizione precedente.',
    img: '/theory/capture.svg',
  },
  {
    id: 4,
    title: 'Territorio',
    description:
      "Il territorio e' l'insieme dei punti vuoti controllati da un giocatore.",
    img: '/theory/territory.svg',
  },
  {
    id: 5,
    title: 'Occhi',
    description:
      'Una catena con due occhi veri non puo\' essere catturata.',
    img: '/theory/capture.svg',
  },
];

const LIBERTA_LINES = [
  'Ogni pietra ha libertà pari agli spazi vuoti ortogonali ad essa.',
  'Gli spazi vuoti diagonali non contano come libertà.',
  'Le pietre adiacenti collegate ortogonalmente formano catene di pietre che condividono le libertà.',
];
const CATTURA_LINES = [
  'Quando tutte le libertà di una catena avversaria vengono occupate, le pietre vengono rimosse dal goban.',
  "Nell'esempio la catena bianca ha soltanto una libertà. Quando nero la occupa le pietre vengono rimosse.",
  "Le pietre catturate saranno considerati prigionieri dell'avversario e conteranno un punto ciascuno alla fine della partita.",
];
const KO_LINES = [
  'La regola del ko impedisce di ripetere subito la stessa posizione.',
  "Dopo una cattura, l'avversario non puo' ricatturare immediatamente nel punto del ko.",
  'Deve prima giocare altrove e può ricatturare solo alla mossa successiva.',
];
const TERRITORIO_LINES = [
  "Il territorio e' formato dai punti vuoti circondati e protetti dalle tue pietre.",
  'Per contare il punteggio somma i punti di territorio e le pietre catturate.',
  'Le aree contese non sono territorio di nessuno.',
];
const OCCHI_LINES = [
  'Un occhio e\' uno spazio vuoto interno circondato dalle tue pietre.',
  'Con due occhi una catena non puo\' essere catturata.',
  'Un solo occhio non basta: l\'avversario puo\' riempirlo.',
];

const labelsFromMeta = (meta?: GoMeta): Label[] => {
  if (!meta?.extras) return [];
  const ex = meta.extras as Record<string, string[]>;
  const toLabels = (kind: LabelKind, arr?: string[]) =>
    (arr ?? []).flatMap((pt) => {
      if (!pt || pt.length < 2) return [];
      return [
        {
          r: pt.charCodeAt(1) - 97,
          c: pt.charCodeAt(0) - 97,
          kind,
        },
      ];
    });
  const shapes: Label[] = [
    ...toLabels('TR', ex.TR),
    ...toLabels('SQ', ex.SQ),
    ...toLabels('CR', ex.CR),
    ...toLabels('MA', ex.MA),
  ];
  const lbVals = (ex.LB ?? []).flatMap((raw) => {
    const [pt, text] = raw.split(':');
    if (!pt || !text || pt.length < 2) return [] as Label[];
    return [
      {
        r: pt.charCodeAt(1) - 97,
        c: pt.charCodeAt(0) - 97,
        kind: 'LB' as const,
        text,
      },
    ];
  });
  return [...shapes, ...lbVals];
};

export default function TheoryPage() {
  const [activeRuleId, setActiveRuleId] = useState<Rule['id']>(RULES[0].id);
  const activeRule = useMemo(
    () => RULES.find((rule) => rule.id === activeRuleId) ?? RULES[0],
    [activeRuleId],
  );
  const isLibertaRule = activeRule.title === 'Libertà';
  const isCatturaRule = activeRule.title === 'Cattura';
  const isKoRule = activeRule.title === 'Ko';
  const isTerritorioRule = activeRule.title === 'Territorio';
  const isOcchiRule = activeRule.title === 'Occhi';
  const speechLines = useMemo(
    () =>
      isLibertaRule
        ? LIBERTA_LINES
        : isCatturaRule
          ? CATTURA_LINES
          : isKoRule
            ? KO_LINES
            : isTerritorioRule
              ? TERRITORIO_LINES
              : isOcchiRule
                ? OCCHI_LINES
              : [activeRule.description],
    [
      activeRule.description,
      isCatturaRule,
      isKoRule,
      isLibertaRule,
      isTerritorioRule,
      isOcchiRule,
    ],
  );
  const [speechIndex, setSpeechIndex] = useState(0);
  const [labels, setLabels] = useState<Label[]>([]);
  const [speechId, setSpeechId] = useState(0);
  const [speechText, setSpeechText] = useState<string | null>(null);

  const handleMetaChange = useCallback((meta: GoMeta) => {
    setLabels(labelsFromMeta(meta));
  }, []);

  useEffect(() => {
    const nextText = speechLines[speechIndex] ?? speechLines[0];
    if (!nextText) return;
    setSpeechText(nextText);
    setSpeechId((id) => id + 1);
  }, [speechIndex, speechLines]);

  const canGoPrev = speechIndex > 0;
  const canGoNext = speechIndex < speechLines.length - 1;
  const speechControls =
    speechLines.length > 1 ? (
      <>
        {canGoPrev ? (
          <button
            type="button"
            onClick={() => setSpeechIndex((idx) => Math.max(0, idx - 1))}
            className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white/90 p-1.5 text-stone-600 shadow-sm transition hover:bg-stone-50"
            aria-label="Frase precedente"
          >
            <ChevronLeft className="size-4" />
          </button>
        ) : null}
        {canGoNext ? (
          <button
            type="button"
            onClick={() =>
              setSpeechIndex((idx) => Math.min(speechLines.length - 1, idx + 1))
            }
            className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white/90 p-1.5 text-stone-600 shadow-sm transition hover:bg-stone-50"
            aria-label="Frase successiva"
          >
            <ChevronRight className="size-4" />
          </button>
        ) : null}
      </>
    ) : null;

  return (
    <div className="relative min-h-screen bg-[#eaf7ef] text-stone-900">
      <div
        className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_15%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.4)_35%,rgba(234,247,239,0)_70%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Regole Base del Go"
          className="w-full max-w-5xl rounded-[32px] border border-emerald-100/80 bg-white/95 p-6 shadow-2xl shadow-emerald-200/50 backdrop-blur"
        >
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Teoria
              </span>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                Regole Base del Go
              </h1>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/90 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm shadow-emerald-100 transition hover:bg-white"
            >
              Chiudi
              <X className="size-4" />
            </Link>
          </header>

          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside className="flex flex-col gap-3">
              {RULES.map((rule) => {
                const isActive = rule.id === activeRule.id;
                const baseClass =
                  'rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7adf36]';
                const className = isActive
                  ? `${baseClass} border-[#7adf36] bg-[#7adf36] text-white shadow`
                  : `${baseClass} border-stone-200 bg-white/90 text-stone-700 hover:border-[#7adf36] hover:shadow-sm`;
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => {
                      setActiveRuleId(rule.id);
                      setSpeechIndex(0);
                    }}
                    className={className}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {rule.id}
                      </span>
                      <span className="text-sm font-semibold">
                        {rule.title}
                      </span>
                    </span>
                  </button>
                );
              })}
            </aside>

            <section className="rounded-3xl border border-stone-200 bg-[#f7fbff] p-6 shadow-inner shadow-emerald-100/60">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                    Regola {activeRule.id}
                  </p>
                  <h2 className="text-2xl font-semibold">{activeRule.title}</h2>
                  <p className="text-stone-700">{activeRule.description}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm shadow-emerald-100">
                  <MascotIdle
                    className="justify-start"
                    bubbleMaxWidthClass="w-[360px] max-w-[70vw]"
                    speechId={speechId}
                    speechText={speechText}
                    persistSpeech
                    speechControls={speechControls}
                  />
                </div>
                <div className="w-full space-y-4">
                  {isLibertaRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={9}
                        showMoveTree={false}
                        onBoardClick={() => true}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/liberta.sgf"
                      />
                    </div>
                  ) : isCatturaRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={9}
                        showMoveTree={false}
                        onBoardClick={() => true}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/cattura.sgf"
                        loopPlayback={{ enabled: true, intervalMs: 2000 }}
                      />
                    </div>
                  ) : isKoRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={9}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/ko.sgf"
                        loopPlayback={{ enabled: true, intervalMs: 2000 }}
                      />
                    </div>
                  ) : isTerritorioRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={9}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/territorio.sgf"
                        loopPlayback={{ enabled: true, intervalMs: 2000 }}
                      />
                    </div>
                  ) : isOcchiRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={9}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/occhi.sgf"
                        loopPlayback={{ enabled: true, intervalMs: 2000 }}
                      />
                    </div>
                  ) : (
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-white">
                      <Image
                        src={activeRule.img}
                        alt={activeRule.title}
                        fill
                        className="object-contain p-6"
                        sizes="(min-width: 1024px) 420px, 100vw"
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
