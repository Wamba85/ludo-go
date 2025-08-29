/**
 * Componente principale "Goban" che compone board, toolbar e move‑tree.
 *
 * ‑ Gestisce solo *stato UI* (toggle libertà/coordinate) – tutta la logica di
 *   gioco è delegata a `useGobanState`.
 * ‑ Calcola on‑the‑fly i flag di disabilitazione per i pulsanti di navigazione
 *   così la Toolbar rimane puramente presentazionale.
 */

'use client';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import GobanBoard from './goban-board';
import MoveTree from './move-tree';
import Toolbar from './toolbar';
import { AfterPlayCtx, Setup, useGobanState } from '@/hooks/use-goban-state';
import type { Label } from '@/types/goban';
import { exportMoveTreeToSgf, defaultMeta } from '@/lib/sgf/moveNode-adapter';
import type { GoMeta, Coord } from '@/lib/sgf/go-semantic';
import { coordToSgf } from '@/lib/sgf/go-semantic';
import { Card, CardContent } from '@/components/ui/card';
// (useEffect already imported above)

interface GobanProps {
  sgfMoves: string;
  BOARD_SIZE?: number;
  showMoveTree?: boolean;
  exerciseOptions?: {
    setup?: Setup;
    onAfterPlay?: (ctx: AfterPlayCtx) => void;
  };
  /** Optional: intercept board clicks. Return true to stop default handling */
  onBoardClick?: (r: number, c: number) => boolean | void;
  /** Optional labels overlay to render */
  labels?: Label[];
  /** Notify parent when parsed meta changes (useful to import labels/setup) */
  onMetaChange?: (meta: GoMeta) => void;
}

export default function Goban({
  sgfMoves,
  BOARD_SIZE = 19,
  showMoveTree = true,
  exerciseOptions,
  onBoardClick,
  labels,
  onMetaChange,
}: GobanProps) {
  const [sgfText, setSgfText] = useState(sgfMoves); // ← nuovo stato locale
  const state = useGobanState(sgfText, BOARD_SIZE, exerciseOptions); // ← usa sgfText
  const [showLiberties, setShowLiberties] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const MAX_TREE_NODES = 1200;
  const isTreeTooLarge = useMemo(() => {
    let count = 0;
    const stack = [...state.root.children];
    while (stack.length) {
      const n = stack.pop()!;
      count++;
      if (count > MAX_TREE_NODES) return true;
      for (let i = 0; i < n.children.length; i++) stack.push(n.children[i]);
    }
    return false;
  }, [state.root]);

  // ↓↓↓ AGGIUNTA: due azioni SGF
  const handleOpenSgf = async (f: File) => {
    const text = await f.text();
    setSgfText(text); // ← niente replaceTree
  };

  const handleExportSgf = () => {
    // Base meta
    const base = state.meta ?? defaultMeta(BOARD_SIZE);
    // Merge: meta.setup (se presente) + setup applicato (editor o da SGF)
    const editorStones =
      exerciseOptions?.setup?.stones ?? state.appliedSetup?.stones ?? [];
    const AB_editor = editorStones
      .filter((s) => s.color === 1)
      .map((s) => ({ x: s.c, y: s.r }));
    const AW_editor = editorStones
      .filter((s) => s.color === 2)
      .map((s) => ({ x: s.c, y: s.r }));
    const baseSetup = base.setup ?? {};
    const AB_base: Coord[] = baseSetup.AB ?? [];
    const AW_base: Coord[] = baseSetup.AW ?? [];
    const AB: Coord[] = [...AB_base, ...AB_editor];
    const AW: Coord[] = [...AW_base, ...AW_editor];
    const metaSetupMerged: GoMeta =
      AB.length || AW.length
        ? { ...base, setup: { ...base.setup, AB, AW } }
        : base;

    // Merge labels into extras (TR/SQ/CR/MA)
    const extras: Record<string, string[]> = {
      ...(metaSetupMerged.extras ?? {}),
    };
    if (labels && labels.length) {
      const add = (k: 'TR' | 'SQ' | 'CR' | 'MA') => {
        const pts = labels
          .filter((l) => l.kind === k)
          .map((l) => coordToSgf({ x: l.c, y: l.r }));
        if (pts.length) extras[k] = (extras[k] ?? []).concat(pts);
      };
      add('TR');
      add('SQ');
      add('CR');
      add('MA');
      const lbVals = labels
        .filter((l) => l.kind === 'LB' && l.text)
        .map((l) => `${coordToSgf({ x: l.c, y: l.r })}:${l.text}`);
      if (lbVals.length) extras.LB = (extras.LB ?? []).concat(lbVals);
    }
    const meta: GoMeta = { ...metaSetupMerged, extras };
    const sgf = exportMoveTreeToSgf(meta, state.root);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([sgf], { type: 'text/plain;charset=utf-8' }),
    );
    a.download = 'game.sgf';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* flag per disabilitare i pulsanti << < > >> */
  const disableBack = state.currentNode === state.root;
  const disableForward = state.currentNode.children.length === 0;

  // Propagate meta changes to parent (e.g., when opening SGF from toolbar)
  // Use a ref to avoid firing the effect when the callback identity changes.
  const onMetaChangeRef = useRef<typeof onMetaChange>();
  useEffect(() => {
    onMetaChangeRef.current = onMetaChange;
  }, [onMetaChange]);
  useEffect(() => {
    onMetaChangeRef.current?.(state.meta);
  }, [state.meta]);

  return (
    <div className="flex gap-5">
      <div>
        <Toolbar
          {...state} /* nav functions + prisoners */
          playerTurn={state.currentNode.player === 1 ? 'Bianco' : 'Nero'}
          disableBack={disableBack}
          disableForward={disableForward}
          showLiberties={showLiberties}
          setShowLiberties={setShowLiberties}
          showCoordinates={showCoordinates}
          setShowCoordinates={setShowCoordinates}
          onOpenSgf={handleOpenSgf} /* ← nuovo */
          onExportSgf={handleExportSgf}
        />

        <GobanBoard
          board={state.board}
          currentNode={state.currentNode}
          root={state.root}
          koPoint={state.koPoint}
          showLiberties={showLiberties}
          showCoordinates={showCoordinates}
          onIntersectionClick={(r, c) => {
            if (onBoardClick && onBoardClick(r, c)) return;
            state.handleIntersectionClick(r, c);
          }}
          labels={labels}
        />
      </div>

      {/* Right column: comment panel + move tree */}
      <div className="flex flex-col gap-3" style={{ width: 'clamp(260px,28vw,340px)' }}>
        <Card className="rounded-xl shadow-md">
          <CardContent className="p-3">
            <label className="block text-sm mb-1">Commento posizione</label>
            <textarea
              className="w-full rounded border px-2 py-1 text-sm font-mono"
              placeholder={
                state.currentNode === state.root
                  ? 'Nessun commento (posizione iniziale)'
                  : 'Scrivi un commento per questa posizione'
              }
              value={state.currentNode.comment ?? ''}
              onChange={(e) => state.setCurrentComment(e.target.value)}
            />
          </CardContent>
        </Card>

        {showMoveTree && !isTreeTooLarge && (
          <MoveTree
            key={state.treeRev}
            root={state.root}
            currentNode={state.currentNode}
            setCurrentNode={state.setCurrentNode}
          />
        )}
        {showMoveTree && isTreeTooLarge && (
          <div className="text-xs text-stone-500 mt-2">
            L&apos;albero delle mosse è molto grande: nascosto per prestazioni.
          </div>
        )}
      </div>
    </div>
  );
}
