/**
 * Componente principale "Goban" che compone board, toolbar e move‑tree.
 *
 * ‑ Gestisce solo *stato UI* (toggle libertà/coordinate) – tutta la logica di
 *   gioco è delegata a `useGobanState`.
 * ‑ Calcola on‑the‑fly i flag di disabilitazione per i pulsanti di navigazione
 *   così la Toolbar rimane puramente presentazionale.
 */

'use client';
import React, { useMemo, useState } from 'react';
import GobanBoard from './goban-board';
import MoveTree from './move-tree';
import Toolbar from './toolbar';
import { AfterPlayCtx, Setup, useGobanState } from '@/hooks/use-goban-state';
import { exportMoveTreeToSgf, defaultMeta } from '@/lib/sgf/moveNode-adapter';

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
}

export default function Goban({
  sgfMoves,
  BOARD_SIZE = 19,
  showMoveTree = true,
  exerciseOptions,
  onBoardClick,
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
  }, [state.root, state.treeRev]);

  // ↓↓↓ AGGIUNTA: due azioni SGF
  const handleOpenSgf = async (f: File) => {
    const text = await f.text();
    setSgfText(text); // ← niente replaceTree
  };

  const handleExportSgf = () => {
    // Base meta
    const base = state.meta ?? defaultMeta(BOARD_SIZE);
    // Merge: meta.setup (se presente) + override dall'editor
    const editorStones = exerciseOptions?.setup?.stones ?? [];
    const AB_editor = editorStones
      .filter((s) => s.color === 1)
      .map((s) => ({ x: s.c, y: s.r }));
    const AW_editor = editorStones
      .filter((s) => s.color === 2)
      .map((s) => ({ x: s.c, y: s.r }));
    const baseSetup = (base as any)?.setup ?? {};
    const AB_base = baseSetup.AB ?? [];
    const AW_base = baseSetup.AW ?? [];
    const AB = [...AB_base, ...AB_editor];
    const AW = [...AW_base, ...AW_editor];
    const meta =
      AB.length || AW.length
        ? ({ ...(base as any), setup: { AB, AW } } as any)
        : base;
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
        />
      </div>

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
          L'albero delle mosse è molto grande: nascosto per prestazioni.
        </div>
      )}
    </div>
  );
}
