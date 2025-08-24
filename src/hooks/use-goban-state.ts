/**
 * `useGobanState` incapsula **tutta** la logica di gioco / navigazione per il
 * componente Goban.  Nessuna parte di rendering vive qui: il risultato è un
 * hook "head‑less" facile da testare e riutilizzare.
 */

'use client';
import { useState, useRef, useEffect } from 'react';
import { buildTree } from '@/lib/parser-sgf-meta';
import {
  createInitialBoard,
  getChainAndLiberties,
  shiftBranches,
} from '@/utils/go-maths';
import { BOARD_SIZE_DEFAULT } from '@/utils/constants';
import type { MoveNode } from '@/types/goban';

interface PrisonerCount {
  black: number;
  white: number;
}

export type Setup = {
  size: number; // es. 9
  stones: { r: number; c: number; color: 1 | 2 }[]; // 1=nero, 2=bianco
  toPlay: 1 | 2; // chi muove per primo
};

export type AfterPlayCtx = {
  board: number[][];
  prisoners: { black: number; white: number };
  currentNode: MoveNode;
  root: MoveNode;
  lastMove?: MoveNode;
};

export function useGobanState(
  sgfMoves: string,
  boardSize = BOARD_SIZE_DEFAULT,
  opts?: { setup?: Setup; onAfterPlay?: (ctx: AfterPlayCtx) => void },
) {
  /* --------------------------------------------------------------------- */
  /* 1. Albero mosse                                                       */
  /* --------------------------------------------------------------------- */
  // Il root è un nodo "virtuale" che rappresenta la tavola vuota.
  const [root, setRoot] = useState<MoveNode>(() => buildTree(sgfMoves));
  const [currentNode, setCurrentNode] = useState<MoveNode>(root);
  const nextId = useRef(1);

  /* --------------------------------------------------------------------- */
  /* 2. Stato goban (board, prigionieri, ko)                               */
  /* --------------------------------------------------------------------- */
  const [board, setBoard] = useState<number[][]>(createInitialBoard(boardSize));
  const [prisoners, setPrisoners] = useState<PrisonerCount>({
    black: 0,
    white: 0,
  });
  const [koPoint, setKoPoint] = useState<[number, number] | null>(null);
  const [treeRev, setTreeRev] = useState(0);

  const setup = opts?.setup;

  const nextPlayer =
    currentNode === root
      ? (setup?.toPlay ?? (currentNode.player === 1 ? 2 : 1))
      : currentNode.player === 1
        ? 2
        : 1;

  useEffect(() => {
    const newRoot = buildTree(sgfMoves);
    setRoot(newRoot);
    setCurrentNode(newRoot);
    nextId.current = 1; // oppure riallinea con max id se lo usi
  }, [sgfMoves]);

  /* --------------------------------------------------------------------- */
  /* 3. Click su una intersezione                                          */
  /* --------------------------------------------------------------------- */
  const handleIntersectionClick = (row: number, col: number) => {
    if (koPoint && koPoint[0] === row && koPoint[1] === col) return;

    const existing = currentNode.children.find(
      (c) => c.row === row && c.col === col,
    );
    if (existing) {
      setCurrentNode(existing);
      return;
    }

    const insertRow =
      currentNode.children.length === 0
        ? currentNode.branch
        : (() => {
            const maxInSubtree = (n: MoveNode): number => {
              let m = n.branch;
              n.children.forEach((ch) => {
                m = Math.max(m, maxInSubtree(ch));
              });
              return m;
            };
            const maxSiblingBranch = currentNode.children.reduce(
              (m, ch) => Math.max(m, maxInSubtree(ch)),
              currentNode.branch,
            );
            const r = maxSiblingBranch + 1;
            shiftBranches(root, r);
            return r;
          })();

    const newNode: MoveNode = {
      id: nextId.current++,
      row,
      col,
      player: nextPlayer,
      parent: currentNode,
      children: [],
      branch: insertRow,
      depth: currentNode.depth + 1,
    };

    currentNode.children.push(newNode);
    setCurrentNode(newNode);
    setTreeRev((r) => r + 1);
  };

  /* --------------------------------------------------------------------- */
  /* 4. Ricostruzione completa del goban quando cambia currentNode         */
  /* --------------------------------------------------------------------- */
  useEffect(() => {
    const b = createInitialBoard(boardSize);

    // 1) applica setup iniziale
    if (setup) {
      if (setup.size !== boardSize) console.warn('setup.size != boardSize');
      for (const s of setup.stones) {
        if (s.r >= 0 && s.r < boardSize && s.c >= 0 && s.c < boardSize)
          b[s.r][s.c] = s.color;
      }
    }

    // 2) replay mosse fino al currentNode
    let prB = 0,
      prW = 0;
    let tmpKo: [number, number] | null = null;
    const dirs: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    const replay: MoveNode[] = [];
    for (let n: MoveNode | null = currentNode; n && n.parent; n = n.parent)
      replay.unshift(n);

    replay.forEach((mv, idx) => {
      const row = mv.row as number,
        col = mv.col as number;
      if (
        !Number.isInteger(row) ||
        !Number.isInteger(col) ||
        row < 0 ||
        col < 0 ||
        row >= boardSize ||
        col >= boardSize
      )
        return;
      if (b[row][col]) return;

      const player = mv.player,
        opp = player === 1 ? 2 : 1;
      b[row][col] = player;

      let captured = 0;
      let singleCaptured: [number, number] | null = null;
      const visited = new Set<string>();

      dirs.forEach(([dy, dx]) => {
        const ny = row + dy,
          nx = col + dx;
        if (
          ny >= 0 &&
          ny < boardSize &&
          nx >= 0 &&
          nx < boardSize &&
          b[ny][nx] === opp &&
          !visited.has(`${ny},${nx}`)
        ) {
          const { chain, liberties } = getChainAndLiberties(
            ny,
            nx,
            b,
            boardSize,
          );
          if (liberties === 0) {
            if (chain.size === 1) singleCaptured = [ny, nx];
            chain.forEach((p) => {
              const [r, c] = p.split(',').map(Number);
              b[r][c] = 0;
              visited.add(p);
            });
            captured += chain.size;
          }
        }
      });

      if (player === 1) prB += captured;
      else prW += captured;
      if (idx === replay.length - 1 && captured === 1 && singleCaptured)
        tmpKo = singleCaptured;
    });

    setBoard(b);
    setPrisoners({ black: prB, white: prW });
    setKoPoint(tmpKo);

    // 3) callback esercizio
    opts?.onAfterPlay?.({
      board: b,
      prisoners: { black: prB, white: prW },
      currentNode,
      root,
      lastMove: currentNode !== root ? currentNode : undefined,
    });
  }, [currentNode, boardSize, root, setup, opts]);

  /* --------------------------------------------------------------------- */
  /* 5. Navigazione convenience                                            */
  /* --------------------------------------------------------------------- */
  const toStart = () => setCurrentNode(root);
  const back = () => currentNode.parent && setCurrentNode(currentNode.parent);
  const forward = () =>
    currentNode.children[0] && setCurrentNode(currentNode.children[0]);
  const toEnd = () => {
    let n = currentNode;
    while (n.children[0]) n = n.children[0];
    setCurrentNode(n);
  };

  /* --------------------------------------------------------------------- */
  /* 6. API esportata                                                      */
  /* --------------------------------------------------------------------- */
  return {
    board,
    prisoners,
    koPoint,
    currentNode,
    root,
    handleIntersectionClick,
    toStart,
    back,
    forward,
    toEnd,
    setCurrentNode,
    meta: { size: boardSize },
    treeRev,
  } as const;
}
