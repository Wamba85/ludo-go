// ==================================================
// app/editor/page.tsx – SGF Editor (crea/edita partendo da vuoto o da SGF)
// ==================================================
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Goban from '@/components/goban/goban';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loadSgfToMoveTree } from '@/lib/sgf/moveNode-adapter';
import type { Setup } from '@/hooks/use-goban-state';
import type { Label, LabelKind } from '@/types/goban';
import type { GoMeta } from '@/lib/sgf/go-semantic';

// Helpers per numeri/lettere – definiti fuori dal componente per evitare
// dipendenze nei callback (eslint react-hooks/exhaustive-deps)
function letterToRank(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); // 'A' = 65 -> 1
  return n;
}
function rankToLetters(rank: number): string {
  let r = rank;
  let out = '';
  while (r > 0) {
    r--; // 1-based
    out = String.fromCharCode(65 + (r % 26)) + out;
    r = Math.floor(r / 26);
  }
  return out || 'A';
}
function nextNumber(arr: Label[]): number {
  let max = 0;
  for (const l of arr)
    if (l.kind === 'LB' && l.text && /^\d+$/.test(l.text))
      max = Math.max(max, parseInt(l.text, 10));
  return max; // caller aggiunge +1
}
function nextLetterRank(arr: Label[]): number {
  let max = 0;
  for (const l of arr)
    if (l.kind === 'LB' && l.text && /^[A-Z]+$/.test(l.text))
      max = Math.max(max, letterToRank(l.text));
  return max;
}

type Tool =
  | 'play'
  | 'setupB'
  | 'setupW'
  | 'labelTR'
  | 'labelSQ'
  | 'labelCR'
  | 'labelMA'
  | 'labelNUM'
  | 'labelLET';

export default function SgfEditorPage() {
  const [boardSize, setBoardSize] = useState<number>(19);
  const [sgfText, setSgfText] = useState<string>('');
  const [rev, setRev] = useState(0); // per rimontare Goban quando cambia sorgente
  const [tool, setTool] = useState<Tool>('play');
  const [setup, setSetup] = useState<Setup>({
    size: boardSize,
    stones: [],
    toPlay: 1,
  });
  const [labels, setLabels] = useState<Label[]>([]);

  // setup.size segue boardSize
  useEffect(() => {
    setSetup((s) => ({ ...s, size: boardSize }));
  }, [boardSize]);

  const createEmpty = useCallback(() => {
    setSgfText('');
    setSetup({ size: boardSize, stones: [], toPlay: 1 });
    setLabels([]);
    setRev((r) => r + 1);
  }, [boardSize]);

  const handleSgfFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const txt = await f.text();
      // prova a leggere la size dal SGF
      try {
        const wrapped = txt.trim().startsWith('(') ? txt : `(${txt})`;
        const { meta } = loadSgfToMoveTree(wrapped);
        setBoardSize(meta.size ?? boardSize);
        // importa AB/AW nel setup editor così l'export li includerà e l'utente può modificarli
        const stones: Setup['stones'] = [];
        const s: GoMeta['setup'] | undefined = meta.setup;
        s?.AB?.forEach(({ x, y }) => stones.push({ r: y, c: x, color: 1 }));
        s?.AW?.forEach(({ x, y }) => stones.push({ r: y, c: x, color: 2 }));
        setSetup({ size: meta.size ?? boardSize, stones, toPlay: 1 });
        // importa labels (TR/SQ/CR/MA) dalle extras
        const ex = (meta.extras ?? {}) as Record<string, string[]>;
        const toLabels = (kind: LabelKind, arr?: string[]) =>
          (arr ?? []).map(
            (pt) =>
              ({
                r: pt.charCodeAt(1) - 97,
                c: pt.charCodeAt(0) - 97,
                kind,
              }) as Label,
          );
        const shapes: Label[] = [
          ...toLabels('TR', ex.TR),
          ...toLabels('SQ', ex.SQ),
          ...toLabels('CR', ex.CR),
          ...toLabels('MA', ex.MA),
        ];
        const lbVals = (ex.LB ?? []).flatMap((s) => {
          const [pt, text] = s.split(':');
          if (!pt || !text) return [] as Label[];
          return [
            {
              r: pt.charCodeAt(1) - 97,
              c: pt.charCodeAt(0) - 97,
              kind: 'LB' as const,
              text,
            },
          ];
        });
        setLabels([...shapes, ...lbVals]);
      } catch {}
      setSgfText(txt);
      setRev((r) => r + 1);
      // reset input
      e.currentTarget.value = '';
    },
    [boardSize],
  );

  const applySgfText = useCallback(() => {
    // prova a leggere SZ dalla textarea
    try {
      const wrapped = sgfText.trim().startsWith('(') ? sgfText : `(${sgfText})`;
      const { meta } = loadSgfToMoveTree(wrapped);
      setBoardSize(meta.size ?? boardSize);
      const stones: Setup['stones'] = [];
      const s: GoMeta['setup'] | undefined = meta.setup;
      s?.AB?.forEach(({ x, y }) => stones.push({ r: y, c: x, color: 1 }));
      s?.AW?.forEach(({ x, y }) => stones.push({ r: y, c: x, color: 2 }));
      setSetup({ size: meta.size ?? boardSize, stones, toPlay: 1 });
      // importa labels da extras
      const ex = (meta.extras ?? {}) as Record<string, string[]>;
      const toLabels = (kind: LabelKind, arr?: string[]) =>
        (arr ?? []).map(
          (pt) =>
            ({
              r: pt.charCodeAt(1) - 97,
              c: pt.charCodeAt(0) - 97,
              kind,
            }) as Label,
        );
      const shapes: Label[] = [
        ...toLabels('TR', ex.TR),
        ...toLabels('SQ', ex.SQ),
        ...toLabels('CR', ex.CR),
        ...toLabels('MA', ex.MA),
      ];
      const lbVals = (ex.LB ?? []).flatMap((s) => {
        const [pt, text] = s.split(':');
        if (!pt || !text) return [] as Label[];
        return [
          {
            r: pt.charCodeAt(1) - 97,
            c: pt.charCodeAt(0) - 97,
            kind: 'LB' as const,
            text,
          },
        ];
      });
      setLabels([...shapes, ...lbVals]);
    } catch {}
    setRev((r) => r + 1);
  }, [sgfText, boardSize]);

  // Override click goban per strumenti setup
  const onBoardClick = useCallback(
    (r: number, c: number) => {
      if (tool === 'play') return false; // usa logica normale
      // Label tools ---------------------------------------------------------
      const labelToolMap: Record<Tool, LabelKind | null> = {
        play: null,
        setupB: null,
        setupW: null,
        labelTR: 'TR',
        labelSQ: 'SQ',
        labelCR: 'CR',
        labelMA: 'MA',
        labelNUM: 'LB',
        labelLET: 'LB',
      } as const;
      const lkind = labelToolMap[tool];
      if (lkind) {
        // Gestione specializzata per numeri/lettere
        if (tool === 'labelNUM' || tool === 'labelLET') {
          setLabels((arr) => {
            const isNumber = tool === 'labelNUM';
            const atIdx = arr.findIndex(
              (l) => l.r === r && l.c === c && l.kind === 'LB',
            );
            if (atIdx >= 0) {
              // Click su un'etichetta testo → se è numero/lettera coerente, rimuovi e rinumera
              const cur = arr[atIdx];
              const text = cur.text ?? '';
              const isCurNum = /^\d+$/.test(text);
              const isCurLet = /^[A-Z]+$/.test(text);
              if ((isNumber && isCurNum) || (!isNumber && isCurLet)) {
                const removedRank = isNumber
                  ? parseInt(text, 10)
                  : letterToRank(text);
                const next = arr.filter((_, i) => i !== atIdx);
                // Rinumerazione: decrementa tutti quelli con rank maggiore
                return next.map((l) => {
                  if (l.kind !== 'LB' || !l.text) return l;
                  if (isNumber && /^\d+$/.test(l.text)) {
                    const v = parseInt(l.text, 10);
                    if (v > removedRank) return { ...l, text: String(v - 1) };
                    return l;
                  }
                  if (!isNumber && /^[A-Z]+$/.test(l.text)) {
                    const v = letterToRank(l.text);
                    if (v > removedRank)
                      return { ...l, text: rankToLetters(v - 1) };
                    return l;
                  }
                  return l;
                });
              }
              // Se c'è un LB ma di tipo diverso (es. lettera vs numero), sostituisci con il prossimo valore
              const next = arr.slice();
              const nextText = isNumber
                ? String(nextNumber(arr) + 1)
                : rankToLetters(nextLetterRank(arr) + 1);
              next[atIdx] = { r, c, kind: 'LB', text: nextText };
              return next;
            }
            // Aggiunta di un nuovo numero/lettera con valore successivo
            const nextText = isNumber
              ? String(nextNumber(arr) + 1)
              : rankToLetters(nextLetterRank(arr) + 1);
            return [...arr, { r, c, kind: 'LB', text: nextText }];
          });
          return true;
        }
        // TR/SQ/CR/MA: toggle/sostituisci come prima
        setLabels((arr) => {
          const idx = arr.findIndex((l) => l.r === r && l.c === c);
          if (idx >= 0) {
            const cur = arr[idx];
            if (cur.kind === lkind)
              return [...arr.slice(0, idx), ...arr.slice(idx + 1)];
            const next = arr.slice();
            next[idx] = { r, c, kind: lkind };
            return next;
          }
          return [...arr, { r, c, kind: lkind }];
        });
        return true; // blocca logica mosse
      }
      const color: 1 | 2 = tool === 'setupB' ? 1 : 2;
      setSetup((s) => {
        const stones = s.stones.slice();
        const idx = stones.findIndex((p) => p.r === r && p.c === c);
        if (idx >= 0) {
          // nuova funzionalità: con lo strumento corrispondente → rimuovi
          if (stones[idx].color === color) stones.splice(idx, 1);
          // altrimenti non fare nulla (evita sostituzioni accidentali)
        } else {
          stones.push({ r, c, color });
        }
        return { ...s, stones };
      });
      return true;
    },
    [tool],
  );

  // Helpers numeri/lettere definiti fuori dal componente (vedi top file)

  // Quando il Goban interno cambia meta (apertura SGF dalla sua toolbar), importa setup+labels
  const onMetaChange = useCallback(
    (meta: GoMeta) => {
      setBoardSize(meta.size ?? boardSize);
      const stones: Setup['stones'] = [];
      meta.setup?.AB?.forEach(({ x, y }) =>
        stones.push({ r: y, c: x, color: 1 }),
      );
      meta.setup?.AW?.forEach(({ x, y }) =>
        stones.push({ r: y, c: x, color: 2 }),
      );
      setSetup({ size: meta.size ?? boardSize, stones, toPlay: 1 });
      const ex = (meta.extras ?? {}) as Record<string, string[]>;
      const toLabels = (kind: LabelKind, arr?: string[]) =>
        (arr ?? []).map(
          (pt) =>
            ({
              r: pt.charCodeAt(1) - 97,
              c: pt.charCodeAt(0) - 97,
              kind,
            }) as Label,
        );
      const shapes: Label[] = [
        ...toLabels('TR', ex.TR),
        ...toLabels('SQ', ex.SQ),
        ...toLabels('CR', ex.CR),
        ...toLabels('MA', ex.MA),
      ];
      const lbVals = (ex.LB ?? []).flatMap((s) => {
        const [pt, text] = s.split(':');
        if (!pt || !text) return [] as Label[];
        return [
          {
            r: pt.charCodeAt(1) - 97,
            c: pt.charCodeAt(0) - 97,
            kind: 'LB' as const,
            text,
          },
        ];
      });
      setLabels([...shapes, ...lbVals]);
    },
    [boardSize],
  );

  const header = useMemo(
    () => (
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Editor SGF</h1>
      </header>
    ),
    [],
  );

  return (
    <div className="flex flex-col px-6 py-8 min-h-screen">
      {header}

      <div className="grid w-full grid-cols-1 lg:grid-cols-[minmax(300px,360px)_1fr] gap-6">
        {/* Pannello controlli */}
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Sorgente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Strumenti */}
            <div>
              <label className="block text-sm mb-1">Strumenti</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={tool === 'play' ? 'default' : 'secondary'}
                  onClick={() => setTool('play')}
                  title="Gioca pietre alternate"
                >
                  ↔︎
                </Button>
                <Button
                  variant={tool === 'labelNUM' ? 'default' : 'secondary'}
                  onClick={() => setTool('labelNUM')}
                  title="Etichetta numerica sequenziale"
                >
                  1
                </Button>
                <Button
                  variant={tool === 'labelLET' ? 'default' : 'secondary'}
                  onClick={() => setTool('labelLET')}
                  title="Etichetta alfabetica sequenziale"
                >
                  A
                </Button>
                <Button
                  variant={tool === 'setupB' ? 'default' : 'secondary'}
                  onClick={() => setTool('setupB')}
                  title="Piazza pietre nere (setup)"
                >
                  ⚫
                </Button>
                <Button
                  variant={tool === 'setupW' ? 'default' : 'secondary'}
                  onClick={() => setTool('setupW')}
                  title="Piazza pietre bianche (setup)"
                >
                  ⚪
                </Button>
                <Button
                  variant={tool === 'labelTR' ? 'default' : 'secondary'}
                  onClick={() => setTool('labelTR')}
                  title="Etichetta triangolo"
                >
                  △
                </Button>
                <Button
                  variant={tool === 'labelSQ' ? 'default' : 'secondary'}
                  onClick={() => setTool('labelSQ')}
                  title="Etichetta quadrato"
                >
                  □
                </Button>
                <Button
                  variant={tool === 'labelCR' ? 'default' : 'secondary'}
                  onClick={() => setTool('labelCR')}
                  title="Etichetta cerchio"
                >
                  ○
                </Button>
                <Button
                  variant={tool === 'labelMA' ? 'default' : 'secondary'}
                  onClick={() => setTool('labelMA')}
                  title="Etichetta X"
                >
                  ✕
                </Button>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                In modalità setup le pietre non modificano l&apos;albero mosse e
                sono visibili alla mossa 0.
              </p>
            </div>
            {/* Nuovo vuoto */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm mb-1">Nuovo goban vuoto</label>
                <select
                  value={boardSize}
                  onChange={(e) => setBoardSize(parseInt(e.target.value, 10))}
                  className="w-full rounded border px-2 py-1 text-sm"
                >
                  <option value={9}>9x9</option>
                  <option value={13}>13x13</option>
                  <option value={19}>19x19</option>
                </select>
              </div>
              <Button onClick={createEmpty}>Crea</Button>
            </div>

            {/* Da file SGF */}
            <div>
              <label className="block text-sm mb-1">Carica da file SGF</label>
              <input
                type="file"
                accept=".sgf,text/plain"
                onChange={handleSgfFile}
                className="block w-full text-sm"
              />
            </div>

            {/* Da testo SGF */}
            <div>
              <label className="block text-sm mb-1">Incolla SGF</label>
              <textarea
                value={sgfText}
                onChange={(e) => setSgfText(e.target.value)}
                rows={6}
                className="w-full rounded border px-2 py-1 text-sm font-mono"
                placeholder="(;GM[1]SZ[19];B[qd];W[dp])"
              />
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" onClick={applySgfText}>
                  Applica SGF
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSgfText('');
                  }}
                >
                  Svuota
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Area editor Goban */}
        <Card className="rounded-2xl shadow-md">
          <CardContent className="p-4">
            <Goban
              key={`${rev}-${boardSize}`}
              sgfMoves={sgfText}
              BOARD_SIZE={boardSize}
              showMoveTree={true}
              exerciseOptions={{ setup }}
              onBoardClick={onBoardClick}
              labels={labels}
              onMetaChange={onMetaChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
