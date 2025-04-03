'use client';
import React, { useState } from 'react';

const BOARD_SIZE = 9; // Può essere 9, 13, 19, ecc.
const CELL_SIZE = 40; // Distanza in pixel tra le intersezioni

// Crea il board iniziale come matrice BOARD_SIZE x BOARD_SIZE, tutte celle a 0 (vuote)
const createInitialBoard = (size: number): number[][] =>
  Array(size)
    .fill(null)
    .map(() => Array(size).fill(0));

// Funzione per contare le libertà di una pietra (intersezioni vuote adiacenti verticalmente e orizzontalmente)
function countLiberties(row: number, col: number, board: number[][]): number {
  let count = 0;
  const directions = [
    [-1, 0], // Sopra
    [1, 0], // Sotto
    [0, -1], // Sinistra
    [0, 1], // Destra
  ];
  directions.forEach(([dr, dc]) => {
    const newRow = row + dr;
    const newCol = col + dc;
    if (
      newRow >= 0 &&
      newRow < BOARD_SIZE &&
      newCol >= 0 &&
      newCol < BOARD_SIZE &&
      board[newRow][newCol] === 0
    ) {
      count++;
    }
  });
  return count;
}

function Goban() {
  const [board, setBoard] = useState<number[][]>(
    createInitialBoard(BOARD_SIZE),
  );
  const [currentPlayer, setCurrentPlayer] = useState<number>(1); // 1 = Nero, 2 = Bianco
  const [message, setMessage] = useState<string>('');

  const handleClick = (row: number, col: number): void => {
    // Verifica se l'intersezione è già occupata
    if (board[row][col] !== 0) {
      setMessage('Mossa non valida: intersezione occupata');
      return;
    }

    // Crea una copia del board e posiziona la pietra
    const newBoard = board.map((r, i) =>
      r.map((cell, j) => (i === row && j === col ? currentPlayer : cell)),
    );

    // Aggiorna lo stato e passa il turno
    setBoard(newBoard);
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    setMessage('');
  };

  // Calcola la dimensione in pixel della griglia (dalla prima all'ultima intersezione)
  const boardPixelSize = (BOARD_SIZE - 1) * CELL_SIZE;

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
        {/* Crea aree cliccabili per ogni intersezione */}
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
        {/* Disegna le pietre e il numero di libertà */}
        {board.map((row, i) =>
          row.map((cell, j) => {
            if (cell === 0) return null;
            const cx = 10 + j * CELL_SIZE;
            const cy = 10 + i * CELL_SIZE;
            const stoneRadius = CELL_SIZE / 2 - 2;
            const liberties = countLiberties(i, j, board);
            return (
              <g key={`stone-${i}-${j}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={stoneRadius}
                  fill={cell === 1 ? 'black' : 'white'}
                  stroke="black"
                />
                <text
                  x={cx}
                  y={cy + 4} // Leggermente centrato verticalmente
                  textAnchor="middle"
                  fill={cell === 1 ? 'white' : 'black'}
                  fontSize="12px"
                >
                  {liberties}
                </text>
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
