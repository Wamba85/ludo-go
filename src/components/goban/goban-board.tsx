/**
 * GobanBoard – responsabile esclusivamente del rendering della scacchiera.
 *
 * Tutta la logica di gioco è già calcolata da `useGobanState`; qui ci limitiamo
 * a visualizzare griglia, pietre, coordinate, libertà, highlight della mossa
 * corrente e simbolo di ko.
 */

'use client';
import React, { useMemo } from 'react';
import { CELL_SIZE, MARGIN } from '@/utils/constants';
import { getChainAndLiberties } from '@/utils/go-maths';
import type { MoveNode } from '@/types/goban';

/* ------------------------------------------------------------------ */
/* Helper locali – inclusi qui per evitare dipendenze extra            */
/* ------------------------------------------------------------------ */

/** Restituisce le etichette di colonna (A‑T senza la I) */
function getColumnLabels(size: number) {
  const out: string[] = [];
  for (let c = 65; out.length < size; c++) {
    const l = String.fromCharCode(c);
    if (l !== 'I') out.push(l);
  }
  return out;
}

/**
 * Calcola (memo) una mappa "pietra‑rappresentante" → numero libertà.
 * Serve per mostrare il numero di libertà sulla pietra «più in alto a sinistra»
 * di ogni catena.
 */
function useChainLiberties(board: number[][]) {
  const BOARD_SIZE = board.length;
  return useMemo(() => {
    const chainLib = new Map<string, number>();
    const seen = new Set<string>();

    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (board[r][c] && !seen.has(`${r},${c}`)) {
          const { chain, liberties } = getChainAndLiberties(
            r,
            c,
            board,
            BOARD_SIZE,
          );
          let rep: [number, number] | null = null;
          chain.forEach((p) => {
            const [y, x] = p.split(',').map(Number);
            if (!rep || y < rep[0] || (y === rep[0] && x < rep[1]))
              rep = [y, x];
          });
          if (rep) chainLib.set(`${rep[0]},${rep[1]}`, liberties);
          chain.forEach((p) => seen.add(p));
        }

    return chainLib;
  }, [BOARD_SIZE, board]);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface Props {
  board: number[][];
  currentNode: MoveNode;
  root: MoveNode;
  koPoint: [number, number] | null;
  showLiberties: boolean;
  showCoordinates: boolean;
  onIntersectionClick: (r: number, c: number) => void;
}

export default function GobanBoard({
  board,
  currentNode,
  root,
  koPoint,
  showLiberties,
  showCoordinates,
  onIntersectionClick,
}: Props) {
  const BOARD_SIZE = board.length;
  const boardPx = (BOARD_SIZE - 1) * CELL_SIZE;
  const svgW = boardPx + MARGIN * 2;
  const svgH = boardPx + MARGIN * 2;
  const colLabels = useMemo(() => getColumnLabels(BOARD_SIZE), [BOARD_SIZE]);

  const chainLib = useChainLiberties(board);

  return (
    <svg
      width={svgW}
      height={svgH}
      className="bg-[#f0d9b5] select-none"
      role="img"
      aria-label="Goban board"
    >
      {/* ---------------- coordinate ---------------- */}
      {showCoordinates &&
        colLabels.map((l, j) => {
          const x = MARGIN + j * CELL_SIZE;
          return (
            <React.Fragment key={l}>
              <text x={x} y={MARGIN - 30} textAnchor="middle" fontSize={20}>
                {l}
              </text>
              <text
                x={x}
                y={MARGIN + boardPx + 30}
                textAnchor="middle"
                fontSize={20}
              >
                {l}
              </text>
            </React.Fragment>
          );
        })}

      {showCoordinates &&
        Array.from({ length: BOARD_SIZE }).map((_, i) => {
          const y = MARGIN + i * CELL_SIZE + 4;
          const lbl = BOARD_SIZE - i;
          return (
            <React.Fragment key={i}>
              <text x={MARGIN - 30} y={y} textAnchor="end" fontSize={20}>
                {lbl}
              </text>
              <text
                x={MARGIN + boardPx + 30}
                y={y}
                textAnchor="start"
                fontSize={20}
              >
                {lbl}
              </text>
            </React.Fragment>
          );
        })}

      {/* ---------------- griglia ---------------- */}
      {Array.from({ length: BOARD_SIZE }).map((_, i) => {
        const pos = MARGIN + i * CELL_SIZE;
        return (
          <React.Fragment key={i}>
            <line
              x1={MARGIN}
              y1={pos}
              x2={MARGIN + boardPx}
              y2={pos}
              stroke="black"
            />
            <line
              x1={MARGIN + i * CELL_SIZE}
              y1={MARGIN}
              x2={MARGIN + i * CELL_SIZE}
              y2={MARGIN + boardPx}
              stroke="black"
            />
          </React.Fragment>
        );
      })}

      {/* ---------------- hit‑areas ---------------- */}
      {board.map((row, r) =>
        row.map((_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={MARGIN + c * CELL_SIZE}
            cy={MARGIN + r * CELL_SIZE}
            r={CELL_SIZE / 2}
            fill="transparent"
            onClick={() => onIntersectionClick(r, c)}
            style={{ cursor: 'pointer' }}
          />
        )),
      )}

      {/* ---------------- pietre ---------------- */}
      {board.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          const cx = MARGIN + c * CELL_SIZE;
          const cy = MARGIN + r * CELL_SIZE;
          const libs = chainLib.get(`${r},${c}`);
          const isCurrent =
            currentNode !== root &&
            r === currentNode.row &&
            c === currentNode.col;

          return (
            <g key={`s${r}-${c}`} pointerEvents="none">
              <circle
                cx={cx}
                cy={cy}
                r={CELL_SIZE / 2 - 2}
                fill={cell === 1 ? 'black' : 'white'}
                stroke="black"
              />

              {showLiberties && libs !== undefined && (
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fill={cell === 1 ? 'white' : 'black'}
                >
                  {libs}
                </text>
              )}

              {isCurrent && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={CELL_SIZE / 2 - 6}
                  fill="none"
                  stroke="orange"
                  strokeWidth={3}
                  pointerEvents="none"
                  opacity={0.7}
                />
              )}
            </g>
          );
        }),
      )}

      {/* ---------------- simbolo KO ---------------- */}
      {koPoint && (
        <text
          pointerEvents="none"
          x={MARGIN + koPoint[1] * CELL_SIZE}
          y={MARGIN + koPoint[0] * CELL_SIZE + 6}
          textAnchor="middle"
          fontSize={22}
          fill="red"
        >
          ×
        </text>
      )}
    </svg>
  );
}
