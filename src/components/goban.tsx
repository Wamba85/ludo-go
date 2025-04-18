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
  branch: number; // riga nell’albero
  depth: number; // colonna = mossa‑1
};

/* ---------- costanti ---------- */
const CELL_SIZE = 40;
const MARGIN = 60;
const NODE_RADIUS = 15;
const COL_SPACING = 70;
const ROW_SPACING = 50;
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
  /* ---- struttura albero ---- */
  const root = useRef<MoveNode>({
    id: 0,
    row: -1,
    col: -1,
    player: 2,
    parent: null,
    children: [],
    branch: 0,
    depth: -1,
  }).current;
  const [currentNode, setCurrentNode] = useState<MoveNode>(root);
  const nextId = useRef(1);
  const nextBranch = useRef(1);

  /* ---- stato goban ---- */
  const [board, setBoard] = useState(createInitialBoard(BOARD_SIZE));
  const [prisonersBlack, setPrisonersBlack] = useState(0);
  const [prisonersWhite, setPrisonersWhite] = useState(0);
  const [message, setMessage] = useState('');
  const [showLiberties, setShowLiberties] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);

  /* ---- ricostruzione board ---- */
  useEffect(() => {
    const b = createInitialBoard(BOARD_SIZE);
    let prB = 0,
      prW = 0;
    const path: MoveNode[] = [];
    for (let n: MoveNode | null = currentNode; n && n !== root; n = n.parent)
      path.unshift(n);

    path.forEach((mv) => {
      if (b[mv.row][mv.col]) return;
      const pl = mv.player,
        opp = pl === 1 ? 2 : 1;
      b[mv.row][mv.col] = pl;

      const remove = (ch: Set<string>) =>
        ch.forEach((p) => {
          const [r, c] = p.split(',').map(Number);
          b[r][c] = 0;
        });

      let captured = 0;
      const done = new Set<string>();
      [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ].forEach(([dr, dc]) => {
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
            captured += chain.size;
            remove(chain);
            chain.forEach((p) => done.add(p));
          }
        }
      });
      if (captured) {
        if (pl === 1) {
          prB += captured;
        } else {
          prW += captured;
        }
      }
    });

    setBoard(b);
    setPrisonersBlack(prB);
    setPrisonersWhite(prW);
    setMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode]);

  const currentPlayer = currentNode.player === 1 ? 2 : 1;

  /* ---- click goban ---- */
  const handleClick = (row: number, col: number) => {
    const existing = currentNode.children.find(
      (c) => c.row === row && c.col === col,
    );
    if (existing) {
      setCurrentNode(existing);
      return;
    }
    const branch =
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
      branch,
      depth: currentNode.depth + 1,
    };
    currentNode.children.push(newNode);
    setCurrentNode(newNode);
  };

  /* ---- navigazione ---- */
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

  /* ---------- catene/libertà ---------- */
  const chainMap = new Map<string, number>();
  const vis = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c] && !vis.has(`${r},${c}`)) {
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
        chain.forEach((p) => vis.add(p));
      }

  /* ---------- albero ---------- */
  const nodes: MoveNode[] = [];
  const dfs = (n: MoveNode) => {
    if (n !== root) nodes.push(n);
    n.children.forEach(dfs);
  };
  dfs(root);

  const maxD = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  const maxB = nodes.reduce((m, n) => Math.max(m, n.branch), 0);
  const treeW = TREE_MARGIN * 2 + maxD * COL_SPACING + NODE_RADIUS * 2;
  const treeH = TREE_MARGIN * 2 + maxB * ROW_SPACING + NODE_RADIUS * 2;

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
              const label = BOARD_SIZE - i;
              return (
                <React.Fragment key={i}>
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

          {/* hitbox */}
          {board.map((row, r) =>
            row.map((_, c) => (
              <circle
                key={r + '-' + c}
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
              const cx = MARGIN + c * CELL_SIZE;
              const cy = MARGIN + r * CELL_SIZE;
              const libs = chainMap.get(`${r},${c}`);
              return (
                <g key={'s' + r + c}>
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

        {/* comandi */}
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

      {/* ---------------- albero ---------------- */}
      {showMoveTree && (
        <div
          style={{
            overflow: 'auto',
            resize: 'both', // ridimensionabile in larghezza e altezza
            border: '1px solid #ccc',
            padding: 8,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <svg width={treeW} height={treeH}>
            {/* linee */}
            {nodes.map((n) => {
              if (!n.parent || n.parent === root) return null;

              const pCx =
                  TREE_MARGIN + n.parent.depth * COL_SPACING + NODE_RADIUS,
                pCy = TREE_MARGIN + n.parent.branch * ROW_SPACING + NODE_RADIUS,
                cCx = TREE_MARGIN + n.depth * COL_SPACING + NODE_RADIUS,
                cCy = TREE_MARGIN + n.branch * ROW_SPACING + NODE_RADIUS;

              const dx = cCx - pCx,
                dy = cCy - pCy,
                dist = Math.sqrt(dx * dx + dy * dy),
                ux = dx / dist,
                uy = dy / dist;

              const x1 = pCx + NODE_RADIUS * ux,
                y1 = pCy + NODE_RADIUS * uy,
                x2 = cCx - NODE_RADIUS * ux,
                y2 = cCy - NODE_RADIUS * uy;

              return (
                <line
                  key={'l' + n.id}
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
              const cx = TREE_MARGIN + n.depth * COL_SPACING + NODE_RADIUS,
                cy = TREE_MARGIN + n.branch * ROW_SPACING + NODE_RADIUS,
                sel = n === currentNode,
                black = n.player === 1;
              return (
                <g
                  key={'n' + n.id}
                  transform={`translate(${cx},${cy})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setCurrentNode(n)}
                >
                  <circle
                    r={NODE_RADIUS}
                    fill={black ? 'black' : 'white'}
                    stroke={sel ? 'red' : 'black'}
                    strokeWidth={sel ? 2 : 1}
                  />
                  <text
                    y={4}
                    textAnchor="middle"
                    fontSize={14}
                    fill={black ? 'white' : 'black'}
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
