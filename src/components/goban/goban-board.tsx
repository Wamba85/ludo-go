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
import type { Label, MoveNode } from '@/types/goban';

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

/**
 * Restituisce le posizioni (r,c) dei punti stella da visualizzare.
 * Richieste:
 * - 19x19: corner star (4-4), side star (10-4) e tengen (10-10)
 * - 13x13: solo corner star (4-4) e tengen
 * - 9x9: come 13x13 ma i corner star sono i 3-3; tengen al centro
 */
function getStarPoints(size: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  if (size <= 1) return pts;
  const max = size - 1;
  const mid = Math.floor(max / 2);

  if (size === 19) {
    const o = 3; // 0-based offset for 4-4
    const a = o;
    const b = max - o;
    // corners
    pts.push([a, a], [a, b], [b, a], [b, b]);
    // sides
    pts.push([mid, a], [mid, b], [a, mid], [b, mid]);
    // center
    pts.push([mid, mid]);
    return pts;
  }

  if (size === 13) {
    const o = 3; // 0-based offset for 4-4
    const a = o;
    const b = max - o;
    // corners
    pts.push([a, a], [a, b], [b, a], [b, b]);
    // center only (no side stars)
    pts.push([mid, mid]);
    return pts;
  }

  if (size === 9) {
    const o = 2; // 0-based offset for 3-3
    const a = o;
    const b = max - o;
    // corners
    pts.push([a, a], [a, b], [b, a], [b, b]);
    // center
    pts.push([mid, mid]);
    return pts;
  }

  // fallback: just center for other odd sizes
  if (size % 2 === 1) pts.push([mid, mid]);
  return pts;
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
  labels?: Label[];
}

export default function GobanBoard({
  board,
  currentNode,
  root,
  koPoint,
  showLiberties,
  showCoordinates,
  onIntersectionClick,
  labels = [],
}: Props) {
  const BOARD_SIZE = board.length;
  const boardPx = (BOARD_SIZE - 1) * CELL_SIZE;
  const svgW = boardPx + MARGIN * 2;
  const svgH = boardPx + MARGIN * 2;
  const colLabels = useMemo(() => getColumnLabels(BOARD_SIZE), [BOARD_SIZE]);

  const chainLib = useChainLiberties(board);
  const starPoints = useMemo(() => getStarPoints(BOARD_SIZE), [BOARD_SIZE]);

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

      {/* ---------------- punti stella (hoshi) ---------------- */}
      {starPoints.map(([r, c], idx) => (
        <circle
          key={`hoshi-${idx}`}
          cx={MARGIN + c * CELL_SIZE}
          cy={MARGIN + r * CELL_SIZE}
          r={4}
          fill="black"
          pointerEvents="none"
        />
      ))}

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

      {/* ---------------- labels (TR/SQ/CR/MA/LB) ---------------- */}
      {labels.map((lb) => {
        const cx = MARGIN + lb.c * CELL_SIZE;
        const cy = MARGIN + lb.r * CELL_SIZE;
        const size = CELL_SIZE / 2 - 8; // padding inside cell
        const stroke = 'red';
        const strokeWidth = 2.5;
        if (lb.kind === 'LB' && lb.text) {
          const cellVal = board[lb.r]?.[lb.c] ?? 0;
          const fill = cellVal === 1 ? 'white' : 'black';
          return (
            <text
              key={`LB${lb.r}-${lb.c}`}
              x={cx}
              y={cy + 5}
              textAnchor="middle"
              fontSize={16}
              fill={fill}
              fontWeight={700}
              pointerEvents="none"
            >
              {lb.text}
            </text>
          );
        }
        if (lb.kind === 'CR') {
          return (
            <circle
              key={`L${lb.r}-${lb.c}`}
              cx={cx}
              cy={cy}
              r={size - 4}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              pointerEvents="none"
            />
          );
        }
        if (lb.kind === 'SQ') {
          const half = size - 4;
          return (
            <rect
              key={`L${lb.r}-${lb.c}`}
              x={cx - half}
              y={cy - half}
              width={half * 2}
              height={half * 2}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              pointerEvents="none"
            />
          );
        }
        if (lb.kind === 'TR') {
          const h = size - 4;
          const p1 = `${cx},${cy - h}`;
          const p2 = `${cx - h},${cy + h}`;
          const p3 = `${cx + h},${cy + h}`;
          return (
            <polygon
              key={`L${lb.r}-${lb.c}`}
              points={`${p1} ${p2} ${p3}`}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              pointerEvents="none"
            />
          );
        }
        // MA (cross)
        const h = size - 4;
        return (
          <g key={`L${lb.r}-${lb.c}`} pointerEvents="none">
            <line
              x1={cx - h}
              y1={cy - h}
              x2={cx + h}
              y2={cy + h}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <line
              x1={cx - h}
              y1={cy + h}
              x2={cx + h}
              y2={cy - h}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </g>
        );
      })}

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
