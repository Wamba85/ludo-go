'use client';
import React, { useState } from 'react';

/**
 * Goban interattivo con albero delle mosse orizzontale.
 *
 * Props:
 *  - `BOARD_SIZE` (number)   Dimensione del goban (9/13/19). Default 9.
 *  - `showMoveTree` (boolean) Se true mostra l'albero delle mosse a destra del goban.
 */
interface GobanProps {
  BOARD_SIZE?: number;
  showMoveTree?: boolean;
}

const CELL_SIZE = 40; // distanza in px fra intersezioni
const MARGIN = 60; // margine del goban
const NODE_RADIUS = 15; // raggio dei cerchi nell’albero mosse
const NODE_SPACING = 70; // distanza orizzontale fra nodi
const MOVE_TREE_MARGIN = 20; // margine interno albero mosse

// Crea il board iniziale
const createInitialBoard = (size: number): number[][] =>
  Array.from({ length: size }, () => Array(size).fill(0));

// Genera le lettere per le colonne, saltando la I
function getColumnLabels(size: number): string[] {
  const labels: string[] = [];
  for (let code = 65; labels.length < size; code++) {
    const letter = String.fromCharCode(code);
    if (letter !== 'I') labels.push(letter);
  }
  return labels;
}

// Calcola catena e libertà
function getChainAndLiberties(
  row: number,
  col: number,
  board: number[][],
  BOARD_SIZE: number,
): { chain: Set<string>; liberties: number } {
  const color = board[row][col];
  const chain = new Set<string>();
  const liberties = new Set<string>();
  const stack: [number, number][] = [[row, col]];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (stack.length) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (chain.has(key)) continue;
    chain.add(key);

    for (const [dr, dc] of dirs) {
      const nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr][nc] === 0) liberties.add(`${nr},${nc}`);
        else if (board[nr][nc] === color) stack.push([nr, nc]);
      }
    }
  }
  return { chain, liberties: liberties.size };
}

export default function Goban({
  BOARD_SIZE = 9,
  showMoveTree = false,
}: GobanProps) {
  const [board, setBoard] = useState(createInitialBoard(BOARD_SIZE));
  const [currentPlayer, setCurrentPlayer] = useState(1); // 1 = Nero, 2 = Bianco
  const [message, setMessage] = useState('');
  const [showLiberties, setShowLiberties] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [prisonersBlack, setPrisonersBlack] = useState(0);
  const [prisonersWhite, setPrisonersWhite] = useState(0);
  const [moves, setMoves] = useState<
    { row: number; col: number; player: number }[]
  >([]);

  /* ----------------------- gestione click sul goban ----------------------- */
  const handleClick = (row: number, col: number) => {
    if (board[row][col] !== 0) {
      setMessage('Mossa non valida: intersezione occupata');
      return;
    }

    const newBoard = board.map((r, i) =>
      r.map((cell, j) => (i === row && j === col ? currentPlayer : cell)),
    );

    const movingColor = currentPlayer;
    const opponentColor = movingColor === 1 ? 2 : 1;

    const removeChain = (chain: Set<string>) => {
      chain.forEach((pos) => {
        const [r, c] = pos.split(',').map(Number);
        newBoard[r][c] = 0;
      });
    };

    // catture adiacenti
    let captured = 0;
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    const processed = new Set<string>();
    for (const [dr, dc] of dirs) {
      const nr = row + dr,
        nc = col + dc;
      if (
        nr >= 0 &&
        nr < BOARD_SIZE &&
        nc >= 0 &&
        nc < BOARD_SIZE &&
        newBoard[nr][nc] === opponentColor &&
        !processed.has(`${nr},${nc}`)
      ) {
        const { chain, liberties } = getChainAndLiberties(
          nr,
          nc,
          newBoard,
          BOARD_SIZE,
        );
        if (liberties === 0) {
          removeChain(chain);
          captured += chain.size;
          chain.forEach((p) => processed.add(p));
        }
      }
    }

    // suicidio
    const { liberties: ownLiberties } = getChainAndLiberties(
      row,
      col,
      newBoard,
      BOARD_SIZE,
    );
    if (captured === 0 && ownLiberties === 0) {
      setMessage('Mossa non valida: suicidio');
      return;
    }

    if (captured > 0) {
      if (movingColor === 1) {
        setPrisonersBlack(prisonersBlack + captured);
      } else {
        setPrisonersWhite(prisonersWhite + captured);
      }
    }

    setBoard(newBoard);
    setCurrentPlayer(movingColor === 1 ? 2 : 1);
    setMoves([...moves, { row, col, player: movingColor }]);
    setMessage('');
  };

  /* --------------------------- dimensioni goban --------------------------- */
  const boardPx = (BOARD_SIZE - 1) * CELL_SIZE;
  const svgWidth = boardPx + MARGIN * 2;
  const svgHeight = boardPx + MARGIN * 2;

  /* ---------------------------- catene/libertà ---------------------------- */
  const chainMap = new Map<string, number>();
  const visited = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 0 && !visited.has(`${r},${c}`)) {
        const { chain, liberties } = getChainAndLiberties(
          r,
          c,
          board,
          BOARD_SIZE,
        );
        let rep: [number, number] | null = null;
        chain.forEach((p) => {
          const [pr, pc] = p.split(',').map(Number);
          if (!rep || pr < rep[0] || (pr === rep[0] && pc < rep[1]))
            rep = [pr, pc];
        });
        if (rep) chainMap.set(`${rep[0]},${rep[1]}`, liberties);
        chain.forEach((p) => visited.add(p));
      }
    }
  }

  const columnLabels = getColumnLabels(BOARD_SIZE);

  /* --------------------------- dimensioni albero -------------------------- */
  const moveTreeHeight = NODE_RADIUS * 2 + MOVE_TREE_MARGIN * 2;
  const moveTreeWidth =
    MOVE_TREE_MARGIN * 2 +
    (moves.length > 0
      ? (moves.length - 1) * NODE_SPACING + NODE_RADIUS * 2
      : 0);

  /* -------------------------------- render -------------------------------- */
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
      {/* ------------------------------ GOBAN ----------------------------- */}
      <div>
        <h2>Goban Interattivo</h2>
        <p>Turno: {currentPlayer === 1 ? 'Nero' : 'Bianco'}</p>
        <p>
          Prigionieri: Nero {prisonersBlack} • Bianco {prisonersWhite}
        </p>
        {/* opzioni visualizzazione */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ marginRight: 20 }}>
            <input
              type="checkbox"
              checked={showLiberties}
              onChange={(e) => setShowLiberties(e.target.checked)}
            />{' '}
            Mostra libertà
          </label>
          <label>
            <input
              type="checkbox"
              checked={showCoordinates}
              onChange={(e) => setShowCoordinates(e.target.checked)}
            />{' '}
            Mostra coordinate
          </label>
        </div>

        {/* --------------------------- SVG GOBAN --------------------------- */}
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ background: '#f0d9b5' }}
        >
          {/* coordinate lettere/numeri */}
          {showCoordinates &&
            columnLabels.map((l, j) => {
              const x = MARGIN + j * CELL_SIZE;
              return (
                <React.Fragment key={l + 'coords'}>
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
              const label = (BOARD_SIZE - i).toString();
              return (
                <React.Fragment key={'num' + i}>
                  <text x={MARGIN - 30} y={y} textAnchor="end" fontSize={20}>
                    {label}
                  </text>
                  <text
                    x={MARGIN + boardPx + 30}
                    y={y}
                    textAnchor="start"
                    fontSize={20}
                  >
                    {label}
                  </text>
                </React.Fragment>
              );
            })}

          {/* linee goban */}
          {Array.from({ length: BOARD_SIZE }).map((_, i) => {
            const pos = MARGIN + i * CELL_SIZE;
            return (
              <React.Fragment key={'line' + i}>
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

          {/* aree cliccabili */}
          {board.map((row, r) =>
            row.map((_, c) => (
              <circle
                key={`hit-${r}-${c}`}
                cx={MARGIN + c * CELL_SIZE}
                cy={MARGIN + r * CELL_SIZE}
                r={CELL_SIZE / 2}
                fill="transparent"
                onClick={() => handleClick(r, c)}
                style={{ cursor: 'pointer' }}
              />
            )),
          )}

          {/* pietre */}
          {board.map((row, r) =>
            row.map((cell, c) => {
              if (cell === 0) return null;
              const cx = MARGIN + c * CELL_SIZE;
              const cy = MARGIN + r * CELL_SIZE;
              const lib = chainMap.get(`${r},${c}`);
              return (
                <g key={`stone-${r}-${c}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={CELL_SIZE / 2 - 2}
                    fill={cell === 1 ? 'black' : 'white'}
                    stroke="black"
                  />
                  {showLiberties && lib !== undefined && (
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill={cell === 1 ? 'white' : 'black'}
                      fontSize={12}
                    >
                      {lib}
                    </text>
                  )}
                </g>
              );
            }),
          )}
        </svg>
        {message && <p style={{ color: 'red' }}>{message}</p>}
      </div>

      {/* --------------------------- ALBERO MOSSE --------------------------- */}
      {showMoveTree && (
        <div
          style={{
            overflowX: 'auto',
            resize: 'horizontal',
            border: '1px solid #ccc',
            padding: 10,
            maxWidth: '100%',
          }}
        >
          <svg width={moveTreeWidth} height={moveTreeHeight}>
            {moves.map((move, idx) => {
              const cx = MOVE_TREE_MARGIN + idx * NODE_SPACING;
              const cy = moveTreeHeight / 2;
              const prevCx =
                MOVE_TREE_MARGIN + (idx - 1) * NODE_SPACING + NODE_RADIUS;
              const nextCx = cx - NODE_RADIUS;
              const isBlack = move.player === 1;

              return (
                <g key={`node-${idx}`}>
                  {/* linea dal bordo del nodo precedente al bordo dell'attuale */}
                  {idx > 0 && (
                    <line
                      x1={prevCx}
                      y1={cy}
                      x2={nextCx}
                      y2={cy}
                      stroke="black"
                    />
                  )}

                  {/* nodo */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={NODE_RADIUS}
                    fill={isBlack ? 'black' : 'white'}
                    stroke="black"
                  />
                  {/* numero mossa */}
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fill={isBlack ? 'white' : 'black'}
                    fontSize={14}
                  >
                    {idx + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
