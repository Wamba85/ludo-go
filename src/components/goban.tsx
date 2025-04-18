'use client';
import React, { useState, useEffect, useRef } from 'react';

/* ---------- tipi ---------- */
interface GobanProps {
  BOARD_SIZE?: number;
  showMoveTree?: boolean;
}

type MoveNode = {
  id: number;
  row: number;
  col: number;
  player: number; // 1 nero, 2 bianco
  parent: MoveNode | null;
  children: MoveNode[];
  branch: number; // indice riga nell’albero
  depth: number; // colonna (numero di mossa‑1)
};

/* ---------- costanti ---------- */
const CELL_SIZE = 40;
const MARGIN = 60;
const NODE_RADIUS = 15;
const COL_SPACING = 70; // distanza orizzontale nodi
const ROW_SPACING = 50; // distanza verticale rami
const TREE_MARGIN = 20;

/* ---------- utilità ---------- */
const createInitialBoard = (n: number) =>
  Array.from({ length: n }, () => Array(n).fill(0));

const getColumnLabels = (size: number) => {
  const labels: string[] = [];
  for (let c = 65; labels.length < size; c++) {
    const l = String.fromCharCode(c);
    if (l !== 'I') labels.push(l);
  }
  return labels;
};

function getChainAndLiberties(
  row: number,
  col: number,
  board: number[][],
  size: number,
) {
  const color = board[row][col];
  const chain = new Set<string>();
  const libs = new Set<string>();
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
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        if (board[nr][nc] === 0) libs.add(`${nr},${nc}`);
        else if (board[nr][nc] === color) stack.push([nr, nc]);
      }
    }
  }
  return { chain, liberties: libs.size };
}

/* ---------- componente ---------- */
export default function Goban({
  BOARD_SIZE = 9,
  showMoveTree = true,
}: GobanProps) {
  /* ---- struttura albero mosse ---- */
  const root = useRef<MoveNode>({
    id: 0,
    row: -1,
    col: -1,
    player: 2, // così il primo giocatore è 1
    parent: null,
    children: [],
    branch: 0,
    depth: -1,
  }).current;
  const [currentNode, setCurrentNode] = useState<MoveNode>(root);
  const nextId = useRef(1);
  const nextBranch = useRef(1); // 0 = mainline

  /* ---- stato goban e prigionieri ---- */
  const [board, setBoard] = useState(createInitialBoard(BOARD_SIZE));
  const [prisonersBlack, setPrisonersBlack] = useState(0);
  const [prisonersWhite, setPrisonersWhite] = useState(0);
  const [message, setMessage] = useState('');
  const [showLiberties, setShowLiberties] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);

  /* ---- ricostruzione board quando cambia currentNode ---- */
  useEffect(() => {
    const b = createInitialBoard(BOARD_SIZE);
    let blackPr = 0,
      whitePr = 0;

    // risaliamo fino alla radice, poi riproduciamo le mosse
    const path: MoveNode[] = [];
    for (let n: MoveNode | null = currentNode; n && n !== root; n = n.parent)
      path.unshift(n);

    path.forEach((mv) => {
      // se intersezione già occupata (può succedere con rami), ignora la mossa
      if (b[mv.row][mv.col] !== 0) return;

      const player = mv.player;
      b[mv.row][mv.col] = player;
      const opp = player === 1 ? 2 : 1;

      const removeChain = (ch: Set<string>) => {
        ch.forEach((p) => {
          const [r, c] = p.split(',').map(Number);
          b[r][c] = 0;
        });
      };

      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      let captured = 0;
      const done = new Set<string>();
      for (const [dr, dc] of dirs) {
        const nr = mv.row + dr,
          nc = mv.col + dc;
        if (
          nr >= 0 &&
          nr < BOARD_SIZE &&
          nc >= 0 &&
          nc < BOARD_SIZE &&
          b[nr][nc] === opp &&
          !done.has(`${nr},${nc}`)
        ) {
          const { chain, liberties } = getChainAndLiberties(
            nr,
            nc,
            b,
            BOARD_SIZE,
          );
          if (liberties === 0) {
            removeChain(chain);
            captured += chain.size;
            chain.forEach((p) => done.add(p));
          }
        }
      }
      if (captured) {
        if (player === 1) blackPr += captured;
        else whitePr += captured;
      }
    });

    setBoard(b);
    setPrisonersBlack(blackPr);
    setPrisonersWhite(whitePr);
    setMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode]);

  /* ---- player corrente ---- */
  const currentPlayer = currentNode.player === 1 ? 2 : 1;

  /* ---- click sul goban ---- */
  const handleClick = (row: number, col: number) => {
    // se la mossa è identica ad un figlio esistente, segui quel ramo
    const existing = currentNode.children.find(
      (c) => c.row === row && c.col === col,
    );
    if (existing) {
      setCurrentNode(existing);
      return;
    }

    // altrimenti crea nuovo ramo
    const newBranch =
      currentNode.children.length === 0
        ? currentNode.branch
        : nextBranch.current++;

    const newNode: MoveNode = {
      id: nextId.current++,
      row,
      col,
      player: currentPlayer,
      parent: currentNode,
      children: [],
      branch: newBranch,
      depth: currentNode.depth + 1,
    };
    currentNode.children.push(newNode);
    setCurrentNode(newNode);
  };

  /* ---- comandi navigazione ---- */
  const toStart = () => setCurrentNode(root);
  const back = () => currentNode.parent && setCurrentNode(currentNode.parent);
  const forward = () =>
    currentNode.children[0] && setCurrentNode(currentNode.children[0]);
  const toEnd = () => {
    let n = currentNode;
    while (n.children[0]) n = n.children[0];
    setCurrentNode(n);
  };

  /* ---------- layout goban ---------- */
  const boardPx = (BOARD_SIZE - 1) * CELL_SIZE;
  const svgWidth = boardPx + MARGIN * 2;
  const svgHeight = boardPx + MARGIN * 2;
  const columnLabels = getColumnLabels(BOARD_SIZE);

  /* ---------- catene/libertà (solo visuale) ---------- */
  const chainMap = new Map<string, number>();
  const visited = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c] && !visited.has(`${r},${c}`)) {
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

  /* ---------- preparazione albero ---------- */
  const nodes: MoveNode[] = [];
  const dfs = (n: MoveNode) => {
    if (n !== root) nodes.push(n);
    n.children.forEach(dfs);
  };
  dfs(root);

  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  const maxBranch = nodes.reduce((m, n) => Math.max(m, n.branch), 0);
  const treeWidth = TREE_MARGIN * 2 + maxDepth * COL_SPACING + NODE_RADIUS * 2;
  const treeHeight =
    TREE_MARGIN * 2 + maxBranch * ROW_SPACING + NODE_RADIUS * 2;

  /* ---------- render ---------- */
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
      {/* ---------------- goban ---------------- */}
      <div>
        <h3>Goban interattivo</h3>
        <p>
          Turno: {currentPlayer === 1 ? 'Nero' : 'Bianco'} • Prigionieri → Nero{' '}
          {prisonersBlack} ⁄ Bianco {prisonersWhite}
        </p>
        {/* opzioni */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ marginRight: 16 }}>
            <input
              type="checkbox"
              checked={showLiberties}
              onChange={(e) => setShowLiberties(e.target.checked)}
            />{' '}
            Libertà
          </label>
          <label>
            <input
              type="checkbox"
              checked={showCoordinates}
              onChange={(e) => setShowCoordinates(e.target.checked)}
            />{' '}
            Coordinate
          </label>
        </div>

        {/* svg goban */}
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ background: '#f0d9b5' }}
        >
          {/* coordinate */}
          {showCoordinates &&
            columnLabels.map((l, j) => {
              const x = MARGIN + j * CELL_SIZE;
              return (
                <React.Fragment key={'col' + l}>
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
              const label = BOARD_SIZE - i;
              return (
                <React.Fragment key={'row' + i}>
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

          {/* griglia */}
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

          {/* click‑areas */}
          {board.map((row, r) =>
            row.map((_, c) => (
              <circle
                key={'hit' + r + c}
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
              if (!cell) return null;
              const cx = MARGIN + c * CELL_SIZE,
                cy = MARGIN + r * CELL_SIZE,
                libs = chainMap.get(`${r},${c}`);
              return (
                <g key={'stone' + r + c}>
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
                      fill={cell === 1 ? 'white' : 'black'}
                      fontSize={12}
                    >
                      {libs}
                    </text>
                  )}
                </g>
              );
            }),
          )}
        </svg>

        {/* comandi navigazione */}
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <button onClick={toStart} disabled={currentNode === root}>
            &lt;&lt;
          </button>
          <button onClick={back} disabled={currentNode === root}>
            &lt;
          </button>
          <button
            onClick={forward}
            disabled={currentNode.children.length === 0}
          >
            &gt;
          </button>
          <button onClick={toEnd} disabled={currentNode.children.length === 0}>
            &gt;&gt;
          </button>
        </div>

        {message && <p style={{ color: 'red' }}>{message}</p>}
      </div>

      {/* ---------------- albero mosse ---------------- */}
      {showMoveTree && (
        <div
          style={{
            overflowX: 'auto',
            resize: 'horizontal',
            border: '1px solid #ccc',
            padding: 8,
            maxWidth: '100%',
          }}
        >
          <svg width={treeWidth} height={treeHeight}>
            {/* linee genitore‑figlio */}
            {nodes.map((n) => {
              if (!n.parent || n.parent === root) return null;
              const x1 =
                  TREE_MARGIN + n.parent.depth * COL_SPACING + NODE_RADIUS,
                y1 = TREE_MARGIN + n.parent.branch * ROW_SPACING + NODE_RADIUS,
                x2 = TREE_MARGIN + n.depth * COL_SPACING - NODE_RADIUS,
                y2 = TREE_MARGIN + n.branch * ROW_SPACING + NODE_RADIUS;
              return (
                <line
                  key={'ln' + n.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="black"
                />
              );
            })}

            {/* nodi */}
            {nodes.map((n) => {
              const cx = TREE_MARGIN + n.depth * COL_SPACING,
                cy = TREE_MARGIN + n.branch * ROW_SPACING,
                isBlack = n.player === 1,
                selected = n === currentNode;
              return (
                <g
                  key={'nd' + n.id}
                  transform={`translate(${cx},${cy})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setCurrentNode(n)}
                >
                  <circle
                    cx={NODE_RADIUS}
                    cy={NODE_RADIUS}
                    r={NODE_RADIUS}
                    fill={isBlack ? 'black' : 'white'}
                    stroke={selected ? 'red' : 'black'}
                    strokeWidth={selected ? 2 : 1}
                  />
                  <text
                    x={NODE_RADIUS}
                    y={NODE_RADIUS + 4}
                    textAnchor="middle"
                    fontSize={14}
                    fill={isBlack ? 'white' : 'black'}
                  >
                    {n.depth + 1}
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
