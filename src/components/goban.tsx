'use client';
import React, { useState } from 'react';

const BOARD_SIZE = 9; // Può essere 9, 13, 19, ecc.
const CELL_SIZE = 40; // Distanza in pixel tra le intersezioni

// Crea il board iniziale come matrice BOARD_SIZE x BOARD_SIZE, tutte intersezioni vuote (0)
const createInitialBoard = (size: number): number[][] =>
  Array(size)
    .fill(null)
    .map(() => Array(size).fill(0));

// Funzione che, partendo da una pietra in (row, col), raccoglie la catena di pietre adiacenti (stesso colore)
// e calcola le libertà (intersezioni vuote adiacenti univoche) di tutta la catena.
function getChainAndLiberties(
  row: number,
  col: number,
  board: number[][],
): { chain: Set<string>; liberties: number } {
  const color = board[row][col];
  const chain = new Set<string>();
  const libertiesSet = new Set<string>();
  const stack: [number, number][] = [[row, col]];
  const directions = [
    [-1, 0], // sopra
    [1, 0], // sotto
    [0, -1], // sinistra
    [0, 1], // destra
  ];

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (chain.has(key)) continue;
    chain.add(key);

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr][nc] === 0) {
          libertiesSet.add(`${nr},${nc}`);
        } else if (board[nr][nc] === color && !chain.has(`${nr},${nc}`)) {
          stack.push([nr, nc]);
        }
      }
    }
  }

  return { chain, liberties: libertiesSet.size };
}

function Goban() {
  const [board, setBoard] = useState<number[][]>(
    createInitialBoard(BOARD_SIZE),
  );
  const [currentPlayer, setCurrentPlayer] = useState<number>(1); // 1 = Nero, 2 = Bianco
  const [message, setMessage] = useState<string>('');

  const handleClick = (row: number, col: number): void => {
    // Se l'intersezione è occupata, non fare nulla
    if (board[row][col] !== 0) {
      setMessage('Mossa non valida: intersezione occupata');
      return;
    }
    // Aggiorna il board con la nuova mossa
    const newBoard = board.map((r, i) =>
      r.map((cell, j) => (i === row && j === col ? currentPlayer : cell)),
    );
    setBoard(newBoard);
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    setMessage('');
  };

  // Calcola la dimensione in pixel della griglia (dalla prima all'ultima intersezione)
  const boardPixelSize = (BOARD_SIZE - 1) * CELL_SIZE;

  // Calcola le catene e le libertà associate.
  // chainMap: mappa in cui la chiave è una stringa "row,col" che identifica la pietra rappresentante
  // della catena e il valore è il numero totale di libertà della catena.
  const chainMap = new Map<string, number>();
  const visited = new Set<string>();

  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] !== 0 && !visited.has(`${i},${j}`)) {
        const { chain, liberties } = getChainAndLiberties(i, j, board);
        // Seleziona la pietra rappresentante: quella con le coordinate minori (più in alto e a sinistra)
        let rep: [number, number] | null = null;
        chain.forEach((pos) => {
          const [r, c] = pos.split(',').map(Number);
          if (rep === null || r < rep[0] || (r === rep[0] && c < rep[1])) {
            rep = [r, c];
          }
        });
        if (rep) {
          chainMap.set(`${rep[0]},${rep[1]}`, liberties);
        }
        // Segna tutte le pietre della catena come visitate
        chain.forEach((pos) => visited.add(pos));
      }
    }
  }

  return (
    <div>
      <h2>Goban Interattivo</h2>
      <p>Turno: {currentPlayer === 1 ? 'Nero' : 'Bianco'}</p>
      <svg
        width={boardPixelSize + 20} // Margine di 10px su ogni lato
        height={boardPixelSize + 20}
        style={{ backgroundColor: '#f0d9b5', margin: '20px' }}
      >
        {/* Disegna le linee orizzontali */}
        {Array.from({ length: BOARD_SIZE }).map((_, i) => {
          const pos = 10 + i * CELL_SIZE;
          return (
            <line
              key={`h-${i}`}
              x1={10}
              y1={pos}
              x2={10 + boardPixelSize}
              y2={pos}
              stroke="black"
            />
          );
        })}
        {/* Disegna le linee verticali */}
        {Array.from({ length: BOARD_SIZE }).map((_, j) => {
          const pos = 10 + j * CELL_SIZE;
          return (
            <line
              key={`v-${j}`}
              x1={pos}
              y1={10}
              x2={pos}
              y2={10 + boardPixelSize}
              stroke="black"
            />
          );
        })}
        {/* Crea le aree cliccabili per ogni intersezione */}
        {board.map((row, i) =>
          row.map((_, j) => {
            const cx = 10 + j * CELL_SIZE;
            const cy = 10 + i * CELL_SIZE;
            return (
              <circle
                key={`click-${i}-${j}`}
                cx={cx}
                cy={cy}
                r={CELL_SIZE / 2} // Area sufficientemente grande per il click
                fill="transparent"
                onClick={() => handleClick(i, j)}
                style={{ cursor: 'pointer' }}
              />
            );
          }),
        )}
        {/* Disegna le pietre. Se la pietra è rappresentante di una catena, mostra le libertà totali della catena */}
        {board.map((row, i) =>
          row.map((cell, j) => {
            if (cell === 0) return null;
            const cx = 10 + j * CELL_SIZE;
            const cy = 10 + i * CELL_SIZE;
            const stoneRadius = CELL_SIZE / 2 - 2;
            const key = `${i},${j}`;
            const liberties = chainMap.get(key);
            return (
              <g key={`stone-${i}-${j}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={stoneRadius}
                  fill={cell === 1 ? 'black' : 'white'}
                  stroke="black"
                />
                {/* Visualizza il numero di libertà solo se questa pietra è il rappresentante della catena */}
                {liberties !== undefined && (
                  <text
                    x={cx}
                    y={cy + 4} // Centra verticalmente il testo
                    textAnchor="middle"
                    fill={cell === 1 ? 'white' : 'black'}
                    fontSize="12px"
                  >
                    {liberties}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </svg>
      {message && (
        <div style={{ color: 'red', marginTop: '10px' }}>{message}</div>
      )}
    </div>
  );
}

export default Goban;
