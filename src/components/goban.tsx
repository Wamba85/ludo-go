'use client';
import { buildTree } from '@/lib/parserSgfMeta';
import React, { useState, useEffect, useRef } from 'react';

/* ---------- tipi ---------- */
interface GobanProps {
  sgfMoves: string;
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
  branch: number; // riga verticale nell’albero
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
  const out: string[] = [];
  for (let c = 65; out.length < size; c++) {
    const l = String.fromCharCode(c);
    if (l !== 'I') out.push(l);
  }
  return out;
};

function getChainAndLiberties(
  r: number,
  c: number,
  board: number[][],
  size: number,
) {
  const color = board[r][c];
  const chain = new Set<string>();
  const libs = new Set<string>();
  const stack: [number, number][] = [[r, c]];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  while (stack.length) {
    const [y, x] = stack.pop()!;
    const key = `${y},${x}`;
    if (chain.has(key)) continue;
    chain.add(key);
    dirs.forEach(([dy, dx]) => {
      const ny = y + dy,
        nx = x + dx;
      if (ny >= 0 && ny < size && nx >= 0 && nx < size) {
        if (board[ny][nx] === 0) libs.add(`${ny},${nx}`);
        else if (board[ny][nx] === color) stack.push([ny, nx]);
      }
    });
  }
  return { chain, liberties: libs.size };
}

/* ---------- componente ---------- */
export default function Goban({
  sgfMoves,
  BOARD_SIZE = 19,
  showMoveTree = true,
}: GobanProps) {
  /* ---- struttura albero ---- */
  // const root = useRef<MoveNode>({
  //   id: 0,
  //   row: -1,
  //   col: -1,
  //   player: 2,
  //   parent: null,
  //   children: [],
  //   branch: 0,
  //   depth: -1,
  // }).current;

  const root = useRef<MoveNode>(buildTree(sgfMoves)).current;
  const [currentNode, setCurrentNode] = useState<MoveNode>(root);
  const nextId = useRef(1);

  /* ---- stato goban ---- */
  const [board, setBoard] = useState(createInitialBoard(BOARD_SIZE));
  const [prisonersBlack, setPrisonersBlack] = useState(0);
  const [prisonersWhite, setPrisonersWhite] = useState(0);
  const [showLiberties, setShowLiberties] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [koPoint, setKoPoint] = useState<[number, number] | null>(null);

  /* ---- helper: sposta tutti i nodi con branch >= from di +1 ---- */
  const shiftBranches = (node: MoveNode, from: number) => {
    if (node.branch >= from) node.branch += 1;
    node.children.forEach((ch) => shiftBranches(ch, from));
  };

  /* ---- click sul goban ---- */
  const handleClick = (row: number, col: number) => {
    if (koPoint && koPoint[0] === row && koPoint[1] === col) return;
    /* 1 – se la mossa esiste già come figlio → naviga */
    const existing = currentNode.children.find(
      (c) => c.row === row && c.col === col,
    );
    if (existing) {
      setCurrentNode(existing);
      return;
    }

    /* 2 – decidiamo la riga (branch) da assegnare */
    let insertRow: number;

    if (currentNode.children.length === 0) {
      /* proseguo la main‑line → stessa riga del padre */
      insertRow = currentNode.branch;
    } else {
      /* nuovo ramo:
       troviamo il branch più basso ALL’INTERNO del sotto‑albero del padre */
      const maxInSubtree = (node: MoveNode): number => {
        let m = node.branch;
        node.children.forEach((ch) => {
          m = Math.max(m, maxInSubtree(ch));
        });
        return m;
      };

      const maxSiblingBranch = currentNode.children.reduce(
        (m, ch) => Math.max(m, maxInSubtree(ch)),
        currentNode.branch,
      );

      insertRow = maxSiblingBranch + 1;

      /* spostiamo in basso tutto ciò che sta da insertRow in poi
       (in tutto l’albero, così non ci sono collisioni di righe)          */
      shiftBranches(root, insertRow);
    }

    /* 3 – creiamo il nuovo nodo */
    const newNode: MoveNode = {
      id: nextId.current++,
      row,
      col,
      player: currentNode.player === 1 ? 2 : 1,
      parent: currentNode,
      children: [],
      branch: insertRow,
      depth: currentNode.depth + 1,
    };

    currentNode.children.push(newNode);
    setCurrentNode(newNode);
  };

  /* ---- ricostruisci goban a ogni cambio di currentNode ---- */
  useEffect(() => {
    const b = createInitialBoard(BOARD_SIZE);
    let prB = 0,
      prW = 0;
    let tmpKo: [number, number] | null = null;

    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]; //  ←  *** QUI ***

    const replay: MoveNode[] = [];
    for (let n: MoveNode | null = currentNode; n && n !== root; n = n.parent)
      replay.unshift(n);

    replay.forEach((mv, idx) => {
      const { row, col } = mv;
      if (b[row][col]) return;
      const player = mv.player,
        opp = player === 1 ? 2 : 1;

      b[row][col] = player;

      let cap = 0;
      let singleCaptured: [number, number] | null = null;

      // --- catture ---
      const done = new Set<string>();
      dirs.forEach(([dy, dx]) => {
        const ny = row + dy,
          nx = col + dx;
        if (
          ny >= 0 &&
          ny < BOARD_SIZE &&
          nx >= 0 &&
          nx < BOARD_SIZE &&
          b[ny][nx] === opp &&
          !done.has(`${ny},${nx}`)
        ) {
          const { chain, liberties } = getChainAndLiberties(
            ny,
            nx,
            b,
            BOARD_SIZE,
          );
          if (liberties === 0) {
            if (chain.size === 1) singleCaptured = [ny, nx]; // 1 pietra ⇒ ko
            chain.forEach((p) => {
              const [r, c] = p.split(',').map(Number);
              b[r][c] = 0;
            });
            cap += chain.size;
            chain.forEach((p) => done.add(p));
          }
        }
      });

      if (player === 1) {
        prB += cap;
      } else {
        prW += cap;
      }

      // --- ko: solo se l’ULTIMA mossa ha catturato esattamente 1 pietra
      if (idx === replay.length - 1 && cap === 1 && singleCaptured) {
        tmpKo = singleCaptured;
      }
    });

    setBoard(b);
    setPrisonersBlack(prB);
    setPrisonersWhite(prW);
    setKoPoint(tmpKo); // <- aggiorna il punto di ko
  }, [currentNode, BOARD_SIZE, root]);

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

  /* ---------- layout base goban ---------- */
  const boardPx = (BOARD_SIZE - 1) * CELL_SIZE;
  const svgW = boardPx + MARGIN * 2;
  const svgH = boardPx + MARGIN * 2;
  const colLabels = getColumnLabels(BOARD_SIZE);

  /* ---------- catene/libertà (solo per display) ---------- */
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
          if (!rep || y < rep[0] || (y === rep[0] && x < rep[1])) rep = [y, x];
        });
        if (rep) chainLib.set(`${rep[0]},${rep[1]}`, liberties);
        chain.forEach((p) => seen.add(p));
      }

  /* ---------- prepara dati albero ---------- */
  const nodes: MoveNode[] = [];
  const walk = (n: MoveNode) => {
    if (n !== root) nodes.push(n);
    n.children.forEach(walk);
  };
  walk(root);

  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  const maxBranch = nodes.reduce((m, n) => Math.max(m, n.branch), 0);
  const treeW = TREE_MARGIN * 2 + maxDepth * COL_SPACING + NODE_RADIUS * 2;
  const treeH = TREE_MARGIN * 2 + maxBranch * ROW_SPACING + NODE_RADIUS * 2;

  /* ---------- render ---------- */
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
      {/* ---------------- goban ---------------- */}
      <div>
        <h3>Goban</h3>
        <p>
          Turno: {currentNode.player === 1 ? 'Bianco' : 'Nero'} • Prigionieri →{' '}
          N {prisonersBlack} ⁄ B {prisonersWhite}
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

        {/* SVG GOBAN */}
        <svg width={svgW} height={svgH} style={{ background: '#f0d9b5' }}>
          {/* coordinate */}
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

          {/* hit‑areas */}
          {board.map((row, r) =>
            row.map((_, c) => (
              <circle
                key={r + '-' + c}
                cx={MARGIN + c * CELL_SIZE}
                cy={MARGIN + r * CELL_SIZE}
                r={CELL_SIZE / 2}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => handleClick(r, c)}
              />
            )),
          )}

          {/* pietre */}
          {board.map((row, r) =>
            row.map((cell, c) => {
              if (!cell) return null;
              const cx = MARGIN + c * CELL_SIZE,
                cy = MARGIN + r * CELL_SIZE;
              const libs = chainLib.get(`${r},${c}`);
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
                      fontSize={12}
                      fill={cell === 1 ? 'white' : 'black'}
                    >
                      {libs}
                    </text>
                  )}

                  {currentNode !== root &&
                    r === currentNode.row &&
                    c === currentNode.col && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={CELL_SIZE / 2 - 6} // anello un po’ più piccolo della pietra
                        fill="none"
                        stroke="orange" // colore tenue; cambia a gusto
                        strokeWidth={3}
                        pointerEvents="none" // non intercetta i click
                        opacity={0.7} // “leggero”
                      />
                    )}
                </g>
              );
            }),
          )}
          {/* simbolo KO */}
          {koPoint && (
            <text
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

        {/* controlli */}
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
      </div>

      {/* ---------------- albero ---------------- */}
      {showMoveTree && (
        <div
          style={{
            /* 1️⃣ dimensione fissa ma “elastica” */
            width: 'clamp(260px, 28vw, 340px)', // min-pref-max
            height: 'clamp(220px, 50vh, 480px)', // idem
            flex: '0 0 clamp(260px, 28vw, 340px)', // evita di espandersi

            /* 2️⃣ il resto invariato */
            overflow: 'auto',
            resize: 'both', // l’utente può comunque ridimensionare
            border: '1px solid #ccc',
            padding: 8,
          }}
        >
          <svg width={treeW} height={treeH}>
            {/* collegamenti */}
            {nodes.map((n) => {
              if (!n.parent || n.parent === root) return null;

              const pCx =
                  TREE_MARGIN + n.parent.depth * COL_SPACING + NODE_RADIUS,
                pCy = TREE_MARGIN + n.parent.branch * ROW_SPACING + NODE_RADIUS,
                cCx = TREE_MARGIN + n.depth * COL_SPACING + NODE_RADIUS,
                cCy = TREE_MARGIN + n.branch * ROW_SPACING + NODE_RADIUS;

              // ➊ stessa riga → orizzontale
              if (n.branch === n.parent.branch) {
                return (
                  <line
                    key={'edge' + n.id}
                    x1={pCx + NODE_RADIUS}
                    y1={pCy}
                    x2={cCx - NODE_RADIUS}
                    y2={cCy}
                    stroke="black"
                  />
                );
              }

              // ➋ ramo SOTTO → gomito (verticale giù + orizzontale)
              if (n.branch > n.parent.branch) {
                return (
                  <polyline
                    key={'edge' + n.id}
                    points={`${pCx},${pCy + NODE_RADIUS} ${pCx},${cCy} ${
                      cCx - NODE_RADIUS
                    },${cCy}`}
                    fill="none"
                    stroke="black"
                  />
                );
              }

              // ➌ ramo SOPRA → segmento orizzontale all’altezza del genitore
              return (
                <line
                  key={'edge' + n.id}
                  x1={pCx + NODE_RADIUS}
                  y1={pCy}
                  x2={cCx - NODE_RADIUS}
                  y2={pCy}
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
