/**
 * Componente principale "Goban" che compone board, toolbar e move‑tree.
 *
 * ‑ Gestisce solo *stato UI* (toggle libertà/coordinate) – tutta la logica di
 *   gioco è delegata a `useGobanState`.
 * ‑ Calcola on‑the‑fly i flag di disabilitazione per i pulsanti di navigazione
 *   così la Toolbar rimane puramente presentazionale.
 */

'use client';
import React, { useState } from 'react';
import GobanBoard from './goban-board';
import MoveTree from './move-tree';
import Toolbar from './toolbar';
import { useGobanState } from '@/hooks/use-goban-state';

interface GobanProps {
  sgfMoves: string;
  BOARD_SIZE?: number;
  showMoveTree?: boolean;
}

export default function Goban({
  sgfMoves,
  BOARD_SIZE = 19,
  showMoveTree = true,
}: GobanProps) {
  const state = useGobanState(sgfMoves, BOARD_SIZE);
  const [showLiberties, setShowLiberties] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);

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
        />

        <GobanBoard
          board={state.board}
          currentNode={state.currentNode}
          root={state.root}
          koPoint={state.koPoint}
          showLiberties={showLiberties}
          showCoordinates={showCoordinates}
          onIntersectionClick={state.handleIntersectionClick}
        />
      </div>

      {showMoveTree && (
        <MoveTree
          root={state.root}
          currentNode={state.currentNode}
          setCurrentNode={state.setCurrentNode}
        />
      )}
    </div>
  );
}
