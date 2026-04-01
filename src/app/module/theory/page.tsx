'use client';

import Goban from '@/components/goban/goban';
import MascotIdle from '@/components/mascot-idle';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { GoMeta } from '@/lib/sgf/go-semantic';
import type { Label, LabelKind } from '@/types/goban';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
    description: "Una catena con due occhi veri non puo' essere catturata.",
    img: '/theory/capture.svg',
  },
  {
    id: 6,
    title: 'Seki',
    description:
      "Il seki e' una vita reciproca: nessuno puo' catturare senza perdere il proprio gruppo.",
    img: '/theory/capture.svg',
  },
  {
    id: 7,
    title: 'Punto vitale',
    description:
      'Il punto vitale è la mossa chiave per vivere o uccidere un gruppo.',
    img: '/theory/capture.svg',
  },
  {
    id: 8,
    title: 'Occhio falso',
    description:
      'Un occhio falso sembra sicuro ma non garantisce la vita del gruppo.',
    img: '/theory/capture.svg',
  },
  {
    id: 9,
    title: 'Sente e gote',
    description:
      "Sente e' una mossa che costringe la risposta. In gote invece lasci l'iniziativa all'avversario.",
    img: '/theory/capture.svg',
  },
  {
    id: 10,
    title: 'Joseki',
    description:
      'I joseki sono sequenze standard di apertura, equilibrate per entrambi i giocatori.',
    img: '/theory/capture.svg',
  },
  {
    id: 11,
    title: 'Snapback',
    description:
      "Lo snapback e' una tattica in cui sacrifichi una pietra per essere catturato e ricatturare subito di piu'.",
    img: '/theory/capture.svg',
  },
  {
    id: 12,
    title: 'Scala',
    description:
      "La scala e' una sequenza di atari in cui il gruppo in fuga corre finche' viene catturato o trova aiuto.",
    img: '/theory/capture.svg',
  },
  {
    id: 13,
    title: 'Rete',
    description:
      "La rete e' una tecnica di cattura in cui chiudi una o piu' pietre in una maglia aperta, bloccando ogni fuga.",
    img: '/theory/capture.svg',
  },
  {
    id: 14,
    title: "Schrodinger's Seki",
    description:
      "Uno seki paradossale: la forma sembra morta, ma nessuno puo' chiuderla senza perdere il proprio gruppo.",
    img: '/theory/capture.svg',
  },
  {
    id: 15,
    title: 'Basic Tenuki Joseki',
    description:
      'Una variante di joseki in cui entrambi i giocatori fanno tenuki, lasciando il seguito locale per giocare altrove.',
    img: '/basic%20tenuki%20joseki.png',
  },
  {
    id: 16,
    title: 'Persistent Eye Tesuji',
    description: 'Un tesuji per far vivere un gruppo con un solo occhio.',
    img: '/theory/capture.svg',
  },
  {
    id: 17,
    title: 'Nuclear Tesuji',
    description:
      'Un modo elegante di perdere la calma e rovinare partita, avversario e club.',
    img: '/nuclear%20tesuji.jpeg',
  },
  {
    id: 18,
    title: 'B2 Bomber',
    description:
      "Una forma esplosiva che oggi compare soprattutto nei combattimenti complessi e puo' cambiare il ritmo dell'intera partita.",
    img: '/b2bomber.jpg',
  },
  {
    id: 19,
    title: 'Consigli di lettura',
    description: 'Tre letture per migliorare le tue abilità di Go.',
    img: '/Get%20Strong%20at%20Gote.png',
  },
];

const RETIRING_RULE_START_ID = 14;
const RETIRING_RULE_STAGGER_MS = 90;
const RETIRING_MASCOT_DELAY_MS = 1800;
const RETIRING_MASCOT_EXIT_MS = 700;
const RETIRING_RULE_EXIT_MS = 700;
const RETIRING_RULE_COUNT = RULES.filter(
  (rule) => rule.id >= RETIRING_RULE_START_ID,
).length;

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
  "Un occhio e' uno spazio vuoto interno circondato dalle tue pietre.",
  "Con due occhi una catena non puo' essere catturata perché ci sono due punti che l'avversario non puo' occupare.",
  "Attenzione gli occhi falsi! Alcuni spazi vuoti possono sembrare occhi ma in realta' non lo sono.",
];
const SEKI_LINES = [
  "Il seki e' una vita reciproca: entrambe le catene rimangono in vita.",
  'Se uno dei due gioca per catturare, perde il proprio gruppo.',
  'I punti interni non sono territorio di nessuno.',
];
const SCHRODINGER_SEKI_LINES = [
  "Ti presento lo Schrodinger's Seki: un gatto di pietre che sembra spacciato, ma non lo e'.",
  "A prima vista pare morto, pero' questa forma e' seki: nessuno puo' davvero chiuderla senza perdere il proprio gruppo.",
  "E' il paradosso perfetto del Go: il gatto sembra vivo e morto insieme finche' non provi a giocare dentro.",
];
const BASIC_TENUKI_JOSEKI_LINES = [
  'Nel Basic Tenuki Joseki, nero e bianco fanno entrambi tenuki: invece di continuare localmente, giocano altrove.',
];
const PERSISTENT_EYE_TESUJI_LINES = [
  "Quando capisci che un tuo gruppo riuscira' ad avere un solo occhio, puoi ricorrere al Persistent Eye Tesuji.",
  "Appena l'occhio nasce, prendi il trapano e fai un buco nel goban abbastanza grande da farci cadere dentro una pietra.",
  "Cosi' se l'avversario prova a catturare quel gruppo, finisce per perdere la propria pietra; ma attenzione, una liberta' persistente puo' aiutare anche l'altro a salvare un gruppo piu' grande.",
];
const NUCLEAR_TESUJI_LINES = [
  'Il Nuclear Tesuji consiste nel lanciare il goban contro il muro e trasformare la sala in caos.',
  'Fra pietre che volano, rumore e rabbia, non si rovina solo la partita: si rischiano ferite serie e si interrompono anche tutte le altre partite del club.',
  "Il risultato e' sempre disastroso: un avversario in pericolo, meno goban disponibili e una sala meno accogliente per tutti.",
];
const B2_BOMBER_LINES = [
  "Per anni il B2 Bomber e' stato usato come forma di chiusura, soprattutto dentro certi tenuki joseki, ma oggi si vede molto meno.",
  "Nell'analisi moderna nessuno regala volentieri questa forma all'avversario: quando compare in un combattimento complicato, puo' cambiare il tempo di tutta la partita.",
  "Contiene addirittura due triangoli vuoti, irradia cosi' poca influenza che quasi sparisce dal radar nemico.",
];
const CONSIGLI_DI_LETTURA_LINES = [
  "Se vuoi allenare l'istinto per il ritmo peggiore possibile, parti da Get Strong at Gote: una lettura perfetta per imparare quando cedere l'iniziativa con stile.",
  'Poi passa a Get Strong at Humiliating Debutants, il manuale perfetto per mettere al proprio posto i novellini.',
  "Infine c'e' Get Strong at Inventing Go Proverbs, per quando le varianti non bastano piu' e senti il bisogno di spiegare tutto con un proverbio appena inventato.",
  'Adesso basta con queste cavolate, mi licenzio',
];
const CONSIGLI_DI_LETTURA_BOOKS = [
  {
    title: 'Get Strong at Gote',
    src: '/Get%20Strong%20at%20Gote.png',
  },
  {
    title: 'Get Strong at Humiliating Debutants',
    src: '/Get%20Strong%20at%20Humiliating%20Debutants.png',
  },
  {
    title: 'Get Strong at Inventing Go Proverbs',
    src: '/Get%20Strong%20at%20Inventing%20Go%20Proverbs.png',
  },
] as const;
const PUNTO_VITALE_LINES = [
  'Il punto vitale è il punto che decide la vita o la morte di un gruppo.',
  'Individuarlo richiede lettura e conoscenza delle forme.',
  'Un gruppo può avere più punti vitali. Se un gruppo ha due o più punti vitali non fare nulla: è vivo!',
];
const OCCHIO_FALSO_LINES = [
  "Un occhio falso sembra un occhio, ma l'avversario può costringerlo a coprirlo.",
  'Questo perché una delle catene del gruppo può essere messa in atari.',
  'Cerca sempre di capire se un occhio si può falsificare.',
];
const SENTE_GOTE_LINES = [
  "Sente e' una mossa che obbliga l'avversario a rispondere.",
  "Finche' resti in sente, hai l'iniziativa e scegli il ritmo della partita.",
  "Con una mossa gote non richiede di essere risposta. L'iniziativa passa all'avversario.",
];
const JOSEKI_LINES = [
  'I joseki sono sequenze di apertura standard ed equilibrate.',
  'Dipendono però anche dalla situazione circostante.',
  'I joseki possono avere molte varianti anche complesse.',
];
const SNAPBACK_LINES = [
  "Lo snapback e' una tattica in cui giochi una pietra sapendo che verra' catturata.",
  "Quando l'avversario la prende, il suo gruppo resta con una sola liberta'.",
  "A quel punto ricatturi subito e prendi piu' pietre di quante ne hai sacrificate.",
];
const SCALA_LINES = [
  "La scala e' una sequenza di atari: attacchi, l'avversario scappa e guadagna una sola liberta' alla volta.",
  'Se non trova aiuto, la fuga continua a zig-zag sul goban fino alla cattura.',
  "Il rompi scala e' una pietra gia' presente sul percorso che spezza la sequenza e salva il gruppo in fuga.",
];
const RETE_LINES = [
  "La rete, o geta, cattura una o piu' pietre circondandole con una maglia che sembra aperta.",
  "Anche se ci sono dei buchi, ogni via di fuga puo' essere chiusa dalla mossa successiva dell'attaccante.",
  "Il nido di gru (a destra) e' un tesuji classico di rete: una forma elegante per imprigionare le pietre in fuga.",
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
  const [speechIndex, setSpeechIndex] = useState(0);
  const [labels, setLabels] = useState<Label[]>([]);
  const [speechId, setSpeechId] = useState(0);
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [isReadingFinaleTriggered, setIsReadingFinaleTriggered] =
    useState(false);
  const [isMascotVisible, setIsMascotVisible] = useState(true);
  const [areLateRulesHiding, setAreLateRulesHiding] = useState(false);
  const [areLateRulesHidden, setAreLateRulesHidden] = useState(false);
  const retirementTimersRef = useRef<number[]>([]);
  const activeRule = useMemo(
    () => RULES.find((rule) => rule.id === activeRuleId) ?? RULES[0],
    [activeRuleId],
  );
  const isLibertaRule = activeRule.title === 'Libertà';
  const isCatturaRule = activeRule.title === 'Cattura';
  const isKoRule = activeRule.title === 'Ko';
  const isTerritorioRule = activeRule.title === 'Territorio';
  const isOcchiRule = activeRule.title === 'Occhi';
  const isSekiRule = activeRule.title === 'Seki';
  const isSchrodingerSekiRule = activeRule.title === "Schrodinger's Seki";
  const isBasicTenukiJosekiRule = activeRule.title === 'Basic Tenuki Joseki';
  const isPersistentEyeTesujiRule =
    activeRule.title === 'Persistent Eye Tesuji';
  const isNuclearTesujiRule = activeRule.title === 'Nuclear Tesuji';
  const isB2BomberRule = activeRule.title === 'B2 Bomber';
  const isConsigliLetturaRule = activeRule.title === 'Consigli di lettura';
  const isPuntoVitaleRule = activeRule.title === 'Punto vitale';
  const isOcchioFalsoRule = activeRule.title === 'Occhio falso';
  const isSenteGoteRule = activeRule.title === 'Sente e gote';
  const isJosekiRule = activeRule.title === 'Joseki';
  const isSnapbackRule = activeRule.title === 'Snapback';
  const isScalaRule = activeRule.title === 'Scala';
  const isReteRule = activeRule.title === 'Rete';
  const isReadingQuitLine =
    isConsigliLetturaRule &&
    speechIndex === CONSIGLI_DI_LETTURA_LINES.length - 1;
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
                : isSekiRule
                  ? SEKI_LINES
                  : isSchrodingerSekiRule
                    ? SCHRODINGER_SEKI_LINES
                    : isBasicTenukiJosekiRule
                      ? BASIC_TENUKI_JOSEKI_LINES
                      : isPersistentEyeTesujiRule
                        ? PERSISTENT_EYE_TESUJI_LINES
                        : isNuclearTesujiRule
                          ? NUCLEAR_TESUJI_LINES
                          : isB2BomberRule
                            ? B2_BOMBER_LINES
                            : isConsigliLetturaRule
                              ? CONSIGLI_DI_LETTURA_LINES
                              : isPuntoVitaleRule
                                ? PUNTO_VITALE_LINES
                                : isOcchioFalsoRule
                                  ? OCCHIO_FALSO_LINES
                                  : isSenteGoteRule
                                    ? SENTE_GOTE_LINES
                                    : isJosekiRule
                                      ? JOSEKI_LINES
                                      : isSnapbackRule
                                        ? SNAPBACK_LINES
                                        : isScalaRule
                                          ? SCALA_LINES
                                          : isReteRule
                                            ? RETE_LINES
                                            : [activeRule.description],
    [
      activeRule.description,
      isCatturaRule,
      isKoRule,
      isLibertaRule,
      isTerritorioRule,
      isOcchiRule,
      isSekiRule,
      isSchrodingerSekiRule,
      isBasicTenukiJosekiRule,
      isPersistentEyeTesujiRule,
      isNuclearTesujiRule,
      isB2BomberRule,
      isConsigliLetturaRule,
      isPuntoVitaleRule,
      isOcchioFalsoRule,
      isSenteGoteRule,
      isJosekiRule,
      isSnapbackRule,
      isScalaRule,
      isReteRule,
    ],
  );
  const currentReadingBook =
    CONSIGLI_DI_LETTURA_BOOKS[
      Math.min(speechIndex, CONSIGLI_DI_LETTURA_BOOKS.length - 1)
    ] ?? CONSIGLI_DI_LETTURA_BOOKS[0];

  const handleMetaChange = useCallback((meta: GoMeta) => {
    setLabels(labelsFromMeta(meta));
  }, []);

  const clearRetirementTimers = useCallback(() => {
    retirementTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    retirementTimersRef.current = [];
  }, []);

  useEffect(() => clearRetirementTimers, [clearRetirementTimers]);

  useEffect(() => {
    const nextText = speechLines[speechIndex] ?? speechLines[0];
    if (!nextText) return;
    setSpeechText(nextText);
    setSpeechId((id) => id + 1);
  }, [speechIndex, speechLines]);

  const handleSpeechComplete = useCallback(() => {
    if (!isReadingQuitLine || isReadingFinaleTriggered) return;

    clearRetirementTimers();
    setIsReadingFinaleTriggered(true);

    retirementTimersRef.current.push(
      window.setTimeout(() => {
        setIsMascotVisible(false);
      }, RETIRING_MASCOT_DELAY_MS),
    );

    retirementTimersRef.current.push(
      window.setTimeout(() => {
        setAreLateRulesHiding(true);
      }, RETIRING_MASCOT_DELAY_MS + RETIRING_MASCOT_EXIT_MS),
    );

    retirementTimersRef.current.push(
      window.setTimeout(() => {
        setAreLateRulesHidden(true);
      }, RETIRING_MASCOT_DELAY_MS +
        RETIRING_MASCOT_EXIT_MS +
        RETIRING_RULE_EXIT_MS +
        RETIRING_RULE_STAGGER_MS * Math.max(0, RETIRING_RULE_COUNT - 1)),
    );
  }, [clearRetirementTimers, isReadingFinaleTriggered, isReadingQuitLine]);

  const canGoPrev = speechIndex > 0;
  const canGoNext = speechIndex < speechLines.length - 1;
  const speechControls =
    speechLines.length > 1 && !isReadingFinaleTriggered ? (
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
          aria-label="Regole Base del Go e teoria"
          className="w-full max-w-5xl rounded-[32px] border border-emerald-100/80 bg-white/95 p-6 shadow-2xl shadow-emerald-200/50 backdrop-blur"
        >
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Teoria
              </span>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                Regole Base del Go e teoria
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
            <aside className="flex flex-col">
              {RULES.map((rule) => {
                const isLateRule = rule.id >= RETIRING_RULE_START_ID;
                if (isLateRule && areLateRulesHidden) return null;

                const isActive = rule.id === activeRule.id;
                const baseClass =
                  'rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7adf36]';
                const className = isActive
                  ? `${baseClass} border-[#7adf36] bg-[#7adf36] text-white shadow`
                  : `${baseClass} border-stone-200 bg-white/90 text-stone-700 hover:border-[#7adf36] hover:shadow-sm`;
                const isLateRuleLeaving = isLateRule && areLateRulesHiding;
                const wrapperClassName = isLateRule
                  ? `overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isLateRuleLeaving
                        ? 'pointer-events-none mb-0 max-h-0 -translate-x-6 scale-95 rotate-[-3deg] opacity-0'
                        : 'mb-3 max-h-24 translate-x-0 scale-100 rotate-0 opacity-100'
                    }`
                  : 'mb-3';
                const wrapperStyle = isLateRule
                  ? {
                      transitionDelay: isLateRuleLeaving
                        ? `${(rule.id - RETIRING_RULE_START_ID) * RETIRING_RULE_STAGGER_MS}ms`
                        : '0ms',
                    }
                  : undefined;
                return (
                  <div
                    key={rule.id}
                    className={wrapperClassName}
                    style={wrapperStyle}
                  >
                    <button
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
                  </div>
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
                <div
                  className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isMascotVisible
                      ? 'max-h-64 translate-y-0 scale-100 opacity-100'
                      : 'pointer-events-none max-h-0 -translate-y-6 scale-95 opacity-0'
                  }`}
                >
                  <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm shadow-emerald-100">
                    <MascotIdle
                      className="justify-start"
                      bubbleMaxWidthClass={
                        isReadingQuitLine
                          ? 'w-[430px] max-w-[78vw]'
                          : 'w-[360px] max-w-[70vw]'
                      }
                      bubbleClassName={
                        isReadingQuitLine
                          ? 'border-rose-500 ring-4 ring-rose-200 shadow-lg shadow-rose-200 animate-pulse'
                          : ''
                      }
                      speechTextClassName={
                        isReadingQuitLine
                          ? 'text-base font-black uppercase tracking-[0.05em] text-rose-700'
                          : ''
                      }
                      speechId={speechId}
                      speechText={speechText}
                      persistSpeech
                      speechControls={speechControls}
                      onSpeechComplete={handleSpeechComplete}
                    />
                  </div>
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
                  ) : isSekiRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={9}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/seki.sgf"
                      />
                    </div>
                  ) : isSchrodingerSekiRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={19}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/schrodinger%20seki.sgf"
                      />
                    </div>
                  ) : isPersistentEyeTesujiRule ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                        <Goban
                          sgfMoves=""
                          BOARD_SIZE={9}
                          showMoveTree={false}
                          boardOnly
                          labels={labels}
                          onMetaChange={handleMetaChange}
                          preloadSgfUrl="/sgf/Persistent%20Eye%20Tesuji.sgf"
                        />
                      </div>
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                        <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl">
                          <Image
                            src="/trapano.webp"
                            alt="Trapano"
                            fill
                            className="object-contain"
                            sizes="(min-width: 1024px) 320px, 100vw"
                          />
                        </div>
                      </div>
                    </div>
                  ) : isNuclearTesujiRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-xl">
                        <Image
                          src="/nuclear%20tesuji.jpeg"
                          alt="Nuclear Tesuji"
                          fill
                          className="object-contain"
                          sizes="(min-width: 1024px) 640px, 100vw"
                        />
                      </div>
                    </div>
                  ) : isB2BomberRule ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                        <Goban
                          sgfMoves=""
                          BOARD_SIZE={9}
                          showMoveTree={false}
                          boardOnly
                          labels={labels}
                          onMetaChange={handleMetaChange}
                          preloadSgfUrl="/sgf/b2bomber.sgf"
                        />
                      </div>
                      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                        <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl">
                          <Image
                            src="/b2bomber.jpg"
                            alt="B2 Bomber"
                            fill
                            className="object-contain"
                            sizes="(min-width: 1024px) 320px, 100vw"
                          />
                        </div>
                      </div>
                    </div>
                  ) : isConsigliLetturaRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <div className="space-y-4">
                        <div className="flex items-center justify-center">
                          <span className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
                            {currentReadingBook.title}
                          </span>
                        </div>
                        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl">
                          <Image
                            src={currentReadingBook.src}
                            alt={currentReadingBook.title}
                            fill
                            className="object-contain"
                            sizes="(min-width: 1024px) 320px, 100vw"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          {CONSIGLI_DI_LETTURA_BOOKS.map((book, index) => (
                            <span
                              key={book.title}
                              className={`h-2.5 w-2.5 rounded-full ${
                                index === speechIndex
                                  ? 'bg-emerald-500'
                                  : 'bg-emerald-100'
                              }`}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : isPuntoVitaleRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={19}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/punto%20vitale.sgf"
                      />
                    </div>
                  ) : isOcchioFalsoRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={9}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/occhio%20falso.sgf"
                      />
                    </div>
                  ) : isSenteGoteRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={13}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/sente%20e%20gote.sgf"
                        loopPlayback={{ enabled: true, intervalMs: 1800 }}
                      />
                    </div>
                  ) : isJosekiRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={13}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/joseki.sgf"
                        loopPlayback={{ enabled: true, intervalMs: 1400 }}
                      />
                    </div>
                  ) : isSnapbackRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={9}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/snapback.sgf"
                        loopPlayback={{ enabled: true, intervalMs: 2500 }}
                      />
                    </div>
                  ) : isScalaRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={13}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/scala.sgf"
                        loopPlayback={{ enabled: true, intervalMs: 1400 }}
                      />
                    </div>
                  ) : isReteRule ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100">
                      <Goban
                        sgfMoves=""
                        BOARD_SIZE={13}
                        showMoveTree={false}
                        boardOnly
                        labels={labels}
                        onMetaChange={handleMetaChange}
                        preloadSgfUrl="/sgf/rete.sgf"
                        loopPlayback={{ enabled: true, intervalMs: 1400 }}
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
