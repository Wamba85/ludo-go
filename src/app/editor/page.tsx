// ==================================================
// app/editor/page.tsx – SGF Editor (crea/edita partendo da vuoto o da SGF)
// ==================================================
'use client';

import { useCallback, useMemo, useState } from 'react';
import Goban from '@/components/goban/goban';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loadSgfToMoveTree } from '@/lib/sgf/moveNode-adapter';

type Mode = 'empty' | 'fromSgf';

export default function SgfEditorPage() {
  const [mode, setMode] = useState<Mode>('empty');
  const [boardSize, setBoardSize] = useState<number>(19);
  const [sgfText, setSgfText] = useState<string>('');
  const [rev, setRev] = useState(0); // per rimontare Goban quando cambia sorgente

  const createEmpty = useCallback(() => {
    setMode('empty');
    setSgfText('');
    setRev((r) => r + 1);
  }, []);

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
      } catch {}
      setSgfText(txt);
      setMode('fromSgf');
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
    } catch {}
    setMode('fromSgf');
    setRev((r) => r + 1);
  }, [sgfText, boardSize]);

  const header = useMemo(
    () => (
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Editor SGF</h1>
      </header>
    ),
    [],
  );

  return (
    <div className="flex flex-col items-center px-6 py-8 min-h-screen">
      {header}

      <div className="grid w-full max-w-5xl grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pannello controlli */}
        <Card className="rounded-2xl shadow-md lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Sorgente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
        <Card className="rounded-2xl shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {mode === 'empty'
                ? `Goban vuoto ${boardSize}x${boardSize}`
                : 'SGF caricato'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-5">
              <Goban
                key={rev}
                sgfMoves={sgfText}
                BOARD_SIZE={boardSize}
                showMoveTree={true}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
