'use client';
import React, { useState } from 'react';

const BOARD_SIZE = 9; // Può essere 9, 13, 19, ecc.
const CELL_SIZE = 40; // Distanza in pixel tra le intersezioni
const MARGIN = 60; // Margine per le coordinate intorno al goban

// Crea il board iniziale come matrice BOARD_SIZE x BOARD_SIZE, tutte intersezioni vuote (0)
const createInitialBoard = (size: number): number[][] =>
  Array(size)
    .fill(null)
    .map(() => Array(size).fill(0));

// Genera le lettere per le colonne, saltando la "I"
function getColumnLabels(size: number): string[] {
  const labels: string[] = [];
  let charCode = 65; // 'A'
  while (labels.length < size) {
    const letter = String.fromCharCode(charCode);
    if (letter !== 'I') {
      labels.push(letter);
    }
    charCode++;
  }
  return labels;
}

// Funzione che, partendo da una pietra in (row, col), raccoglie la catena (stesso colore)
// e calcola le libertà uniche (intersezioni vuote adiacenti in 4 direzioni).
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
  const [showLiberties, setShowLiberties] = useState<boolean>(true);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(true);
  const [prisonersBlack, setPrisonersBlack] = useState<number>(0);
  const [prisonersWhite, setPrisonersWhite] = useState<number>(0);

  const handleClick = (row: number, col: number): void => {
    // Se l'intersezione è già occupata, non fare nulla
    if (board[row][col] !== 0) {
      setMessage('Mossa non valida: intersezione occupata');
      return;
    }

    // Crea una copia del board e piazza la pietra
    const newBoard = board.map((r, i) =>
      r.map((cell, j) => (i === row && j === col ? currentPlayer : cell)),
    );

    const movingColor = currentPlayer;
    const opponentColor = movingColor === 1 ? 2 : 1;

    // Funzione per rimuovere una catena dal board
    const removeChain = (chain: Set<string>) => {
      chain.forEach((pos) => {
        const [r, c] = pos.split(',').map(Number);
        newBoard[r][c] = 0;
      });
    };

    // Controlla le catene avversarie adiacenti e cattura quelle con 0 libertà
    let capturedCount = 0;
    const processed = new Set<string>();
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (
          newBoard[nr][nc] === opponentColor &&
          !processed.has(`${nr},${nc}`)
        ) {
          const { chain, liberties } = getChainAndLiberties(nr, nc, newBoard);
          if (liberties === 0) {
            removeChain(chain);
            capturedCount += chain.size;
            chain.forEach((pos) => processed.add(pos));
          }
        }
      }
    }

    // Verifica la regola di suicidio: se non si è catturata alcuna catena avversaria e la catena
    // propria (a cui appartiene la nuova pietra) ha 0 libertà, la mossa è illegale.
    const { liberties: ownLiberties } = getChainAndLiberties(
      row,
      col,
      newBoard,
    );
    if (capturedCount === 0 && ownLiberties === 0) {
      setMessage('Mossa non valida: suicidio');
      return;
    }

    // Se si è catturato almeno una pietra, aggiorna il conteggio dei prigionieri
    if (capturedCount > 0) {
      if (movingColor === 1) {
        setPrisonersBlack(prisonersBlack + capturedCount);
      } else {
        setPrisonersWhite(prisonersWhite + capturedCount);
      }
    }

    // Aggiorna lo state del board e passa il turno
    setBoard(newBoard);
    setCurrentPlayer(movingColor === 1 ? 2 : 1);
    setMessage('');
  };

  const boardPixelSize = (BOARD_SIZE - 1) * CELL_SIZE;
  const svgWidth = boardPixelSize + MARGIN * 2;
  const svgHeight = boardPixelSize + MARGIN * 2;

  // Calcola le catene e le libertà per il rendering (per mostrare il conteggio sulle pietre rappresentanti)
  const chainMap = new Map<string, number>();
  const visited = new Set<string>();
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] !== 0 && !visited.has(`${i},${j}`)) {
        const { chain, liberties } = getChainAndLiberties(i, j, board);
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
        chain.forEach((pos) => visited.add(pos));
      }
    }
  }

  const columnLabels = getColumnLabels(BOARD_SIZE);

  return (
    <div>
      <h2>Goban Interattivo</h2>
      <p>Turno: {currentPlayer === 1 ? 'Nero' : 'Bianco'}</p>
      <p>
        Prigionieri: Nero ha catturato {prisonersBlack} pietre, Bianco ha
        catturato {prisonersWhite} pietre.
      </p>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ marginRight: '20px' }}>
          <input
            type="checkbox"
            checked={showLiberties}
            onChange={(e) => setShowLiberties(e.target.checked)}
          />{' '}
          Mostra libertà delle catene
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
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ backgroundColor: '#f0d9b5' }}
      >
        {/* Coordinate superiore (lettere) */}
        {showCoordinates &&
          columnLabels.map((label, j) => {
            const x = MARGIN + j * CELL_SIZE;
            const y = MARGIN - 30;
            return (
              <text
                key={`top-${j}`}
                x={x}
                y={y}
                textAnchor="middle"
                fontSize="20px"
              >
                {label}
              </text>
            );
          })}
        {/* Coordinate inferiore (lettere) */}
        {showCoordinates &&
          columnLabels.map((label, j) => {
            const x = MARGIN + j * CELL_SIZE;
            const y = MARGIN + boardPixelSize + 30;
            return (
              <text
                key={`bottom-${j}`}
                x={x}
                y={y}
                textAnchor="middle"
                fontSize="20px"
              >
                {label}
              </text>
            );
          })}
        {/* Coordinate sinistra (numeri) */}
        {showCoordinates &&
          Array.from({ length: BOARD_SIZE }).map((_, i) => {
            const x = MARGIN - 30;
            const label = (BOARD_SIZE - i).toString();
            const y = MARGIN + i * CELL_SIZE + 4;
            return (
              <text
                key={`left-${i}`}
                x={x}
                y={y}
                textAnchor="end"
                fontSize="20px"
              >
                {label}
              </text>
            );
          })}
        {/* Coordinate destra (numeri) */}
        {showCoordinates &&
          Array.from({ length: BOARD_SIZE }).map((_, i) => {
            const x = MARGIN + boardPixelSize + 30;
            const label = (BOARD_SIZE - i).toString();
            const y = MARGIN + i * CELL_SIZE + 4;
            return (
              <text
                key={`right-${i}`}
                x={x}
                y={y}
                textAnchor="start"
                fontSize="20px"
              >
                {label}
              </text>
            );
          })}
        {/* Disegna le linee orizzontali */}
        {Array.from({ length: BOARD_SIZE }).map((_, i) => {
          const pos = MARGIN + i * CELL_SIZE;
          return (
            <line
              key={`h-${i}`}
              x1={MARGIN}
              y1={pos}
              x2={MARGIN + boardPixelSize}
              y2={pos}
              stroke="black"
            />
          );
        })}
        {/* Disegna le linee verticali */}
        {Array.from({ length: BOARD_SIZE }).map((_, j) => {
          return (
            <line
              key={`v-${j}`}
              x1={MARGIN + j * CELL_SIZE}
              y1={MARGIN}
              x2={MARGIN + j * CELL_SIZE}
              y2={MARGIN + boardPixelSize}
              stroke="black"
            />
          );
        })}
        {/* Aree cliccabili per ogni intersezione */}
        {board.map((row, i) =>
          row.map((_, j) => {
            const cx = MARGIN + j * CELL_SIZE;
            const cy = MARGIN + i * CELL_SIZE;
            return (
              <circle
                key={`click-${i}-${j}`}
                cx={cx}
                cy={cy}
                r={CELL_SIZE / 2}
                fill="transparent"
                onClick={() => handleClick(i, j)}
                style={{ cursor: 'pointer' }}
              />
            );
          }),
        )}
        {/* Disegna le pietre e, se attivato, il conteggio delle libertà per la catena */}
        {board.map((row, i) =>
          row.map((cell, j) => {
            if (cell === 0) return null;
            const cx = MARGIN + j * CELL_SIZE;
            const cy = MARGIN + i * CELL_SIZE;
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
                {showLiberties && liberties !== undefined && (
                  <text
                    x={cx}
                    y={cy + 4}
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
